import "server-only";
import Anthropic, { toFile } from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { describeDbError } from "@/lib/db/errors";
import type { AiRun, DocumentRow } from "@/lib/db/types";
import { exerciseRow } from "@/lib/exercises/import";
import { formatSize } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { checkBudget, estimateCostUsd, formatUsd, monthStartIso, sumCostUsd } from "./budget";
import { describeAiError, getAnthropic } from "./client";
import { AI_MODEL, caps, MAX_BYTES_PER_RUN, MAX_DOCUMENTS_PER_RUN, MAX_HINT_LENGTH, MAX_OUTPUT_TOKENS, PROVIDER_FILE_TTL_SECONDS, STALE_CLAIM_MINUTES } from "./config";
import { buildUserText, SYSTEM_PROMPT } from "./prompt";
import { draftsFromOutput, extractOutput, generatedOutput } from "./schema";

type Doc = Pick<DocumentRow, "id" | "filename" | "mime" | "size_bytes" | "storage_path">;
type PendingRun = Pick<AiRun, "id" | "status" | "provider_batch_id" | "provider_file_ids" | "documents" | "claimed_at">;

export const isPdf = (doc: Pick<DocumentRow, "mime" | "filename">) => doc.mime === "application/pdf" || /\.pdf$/i.test(doc.filename);

/** Spending of the current month in USD (one account, or everyone when `userId` is omitted and the client may see all rows). */
export async function monthSpend(client: SupabaseClient, userId?: string): Promise<number> {
  let query = client.from("ai_runs").select("cost_usd").gte("created_at", monthStartIso()).limit(5000);
  if (userId) query = query.eq("user_id", userId);
  const { data, error } = await query;
  if (error) throw new Error(describeDbError(error));
  return sumCostUsd(data ?? []);
}

/** Spending across all accounts needs the service role; without it the deployment cap is checked against the own runs only. */
async function globalSpend(fallback: SupabaseClient): Promise<number> {
  try {
    return await monthSpend(createAdminClient());
  } catch {
    return monthSpend(fallback);
  }
}

function messagesFor(fileIds: string[], filenames: string[], text: string): Anthropic.MessageParam[] {
  return [
    {
      role: "user",
      content: [
        ...fileIds.map((file_id, i) => ({ type: "document" as const, source: { type: "file" as const, file_id }, title: filenames[i] })),
        { type: "text", text },
      ],
    },
  ];
}

async function deleteProviderFiles(client: Anthropic, fileIds: string[]): Promise<void> {
  // best effort: the files expire on their own (PROVIDER_FILE_TTL_SECONDS)
  await Promise.allSettled(fileIds.map((id) => client.files.delete(id)));
}

export type StartResult = { ok: boolean; message: string };

/**
 * Starts a generation job: uploads the chosen PDFs to the provider, counts the input tokens, checks the monthly caps,
 * records the run and submits one batch request. The result is picked up later by `syncRuns`.
 */
export async function startRun(args: { supabase: SupabaseClient; userId: string; moduleId: string; documentIds: string[]; hint: string | null }): Promise<StartResult> {
  const { supabase, userId, moduleId } = args;
  const hint = args.hint?.trim().slice(0, MAX_HINT_LENGTH) || null;
  const ids = [...new Set(args.documentIds)];
  if (ids.length === 0) return { ok: false, message: "Bitte mindestens ein PDF wählen." };
  if (ids.length > MAX_DOCUMENTS_PER_RUN) return { ok: false, message: `Höchstens ${MAX_DOCUMENTS_PER_RUN} Dokumente pro Durchlauf.` };

  let client: Anthropic;
  try {
    client = getAnthropic();
  } catch (e) {
    return { ok: false, message: describeAiError(e) };
  }

  const { data: module } = await supabase.from("modules").select("id, code, name").eq("id", moduleId).maybeSingle<{ id: string; code: string; name: string }>();
  if (!module) return { ok: false, message: "Modul nicht gefunden" };

  const { data: docRows, error: docError } = await supabase
    .from("documents")
    .select("id, filename, mime, size_bytes, storage_path")
    .eq("module_id", moduleId)
    .in("id", ids)
    .returns<Doc[]>();
  if (docError) return { ok: false, message: describeDbError(docError) };
  const docs = ids.map((id) => (docRows ?? []).find((d) => d.id === id)).filter((d): d is Doc => Boolean(d));
  if (docs.length !== ids.length) return { ok: false, message: "Ein gewähltes Dokument gehört nicht zu diesem Modul." };
  const notPdf = docs.find((d) => !isPdf(d));
  if (notPdf) return { ok: false, message: `„${notPdf.filename}“ ist kein PDF. Word- oder PowerPoint-Dateien zuerst als PDF speichern und hochladen.` };
  const bytes = docs.reduce((sum, d) => sum + d.size_bytes, 0);
  if (bytes > MAX_BYTES_PER_RUN) return { ok: false, message: `Die Dokumente sind zusammen zu gross (${formatSize(bytes)}), höchstens ${formatSize(MAX_BYTES_PER_RUN)} pro Durchlauf.` };

  // the caps first, before anything is uploaded
  const limits = caps();
  let userSpent: number;
  let globalSpent: number;
  try {
    [userSpent, globalSpent] = await Promise.all([monthSpend(supabase, userId), globalSpend(supabase)]);
  } catch (e) {
    return { ok: false, message: e instanceof Error ? e.message : "Budget konnte nicht geprüft werden." };
  }
  const early = checkBudget({ reservation: 0, userSpent, globalSpent, userCap: limits.user, globalCap: limits.global });
  if (!early.ok) return { ok: false, message: early.message };

  // the PDFs go to the provider's file store (they expire on their own); the batch request references them
  const fileIds: string[] = [];
  const cleanup = () => deleteProviderFiles(client, fileIds);
  try {
    for (const doc of docs) {
      const { data: blob, error } = await supabase.storage.from("documents").download(doc.storage_path);
      if (error || !blob) {
        await cleanup();
        return { ok: false, message: `„${doc.filename}“ konnte nicht aus dem Speicher geladen werden${error ? `: ${error.message}` : ""}.` };
      }
      const uploaded = await client.files.upload({
        file: await toFile(Buffer.from(await blob.arrayBuffer()), doc.filename, { type: "application/pdf" }),
        expires_in_seconds: PROVIDER_FILE_TTL_SECONDS,
      });
      fileIds.push(uploaded.id);
    }
  } catch (e) {
    await cleanup();
    return { ok: false, message: describeAiError(e) };
  }

  const filenames = docs.map((d) => d.filename);
  const messages = messagesFor(fileIds, filenames, buildUserText({ moduleCode: module.code, moduleName: module.name, filenames, hint }));

  // the input is counted exactly; the output is reserved at its maximum and settled once the run is done
  let inputTokens: number;
  try {
    inputTokens = (await client.messages.countTokens({ model: AI_MODEL, system: SYSTEM_PROMPT, messages })).input_tokens;
  } catch (e) {
    await cleanup();
    return { ok: false, message: `Die Dokumente konnten nicht verarbeitet werden: ${describeAiError(e)}` };
  }
  const reservation = estimateCostUsd(inputTokens, MAX_OUTPUT_TOKENS);
  const budget = checkBudget({ reservation, userSpent, globalSpent, userCap: limits.user, globalCap: limits.global });
  if (!budget.ok) {
    await cleanup();
    return { ok: false, message: budget.message };
  }

  const { data: run, error: insertError } = await supabase
    .from("ai_runs")
    .insert({
      user_id: userId,
      module_id: moduleId,
      documents: docs.map((d) => ({ id: d.id, filename: d.filename })),
      hint,
      model: AI_MODEL,
      provider_file_ids: fileIds,
      input_tokens: inputTokens,
      cost_usd: reservation,
    })
    .select("id")
    .single<{ id: string }>();
  if (insertError || !run) {
    await cleanup();
    return { ok: false, message: describeDbError(insertError ?? {}) };
  }

  try {
    const batch = await client.messages.batches.create({
      requests: [
        {
          custom_id: run.id,
          params: {
            model: AI_MODEL,
            max_tokens: MAX_OUTPUT_TOKENS,
            system: SYSTEM_PROMPT,
            messages,
            output_config: { effort: "high", format: zodOutputFormat(generatedOutput) },
          },
        },
      ],
    });
    await supabase.from("ai_runs").update({ provider_batch_id: batch.id }).eq("id", run.id);
  } catch (e) {
    const message = describeAiError(e);
    await supabase.from("ai_runs").update({ status: "failed", error: message, cost_usd: 0, finished_at: new Date().toISOString() }).eq("id", run.id);
    await cleanup();
    return { ok: false, message };
  }
  return {
    ok: true,
    message: `Auftrag gestartet: ${docs.length} ${docs.length === 1 ? "Dokument" : "Dokumente"}, Kosten bis zu ${formatUsd(reservation)}. Die Entwürfe erscheinen hier, sobald die KI fertig ist, meist innert Minuten.`,
  };
}

export type SyncResult = { changed: boolean; queued: number };

/** Looks up every open run of the module at the provider and turns finished results into drafts. */
export async function syncRuns(args: { supabase: SupabaseClient; userId: string; moduleId: string }): Promise<SyncResult> {
  const { supabase, userId, moduleId } = args;
  const { data, error } = await supabase
    .from("ai_runs")
    .select("id, status, provider_batch_id, provider_file_ids, documents, claimed_at")
    .eq("module_id", moduleId)
    .in("status", ["queued", "processing"])
    .order("created_at")
    .returns<PendingRun[]>();
  if (error || !data || data.length === 0) return { changed: false, queued: 0 };

  const staleBefore = new Date(Date.now() - STALE_CLAIM_MINUTES * 60_000).toISOString();
  // queued runs, plus claims another sync left behind (its function died)
  const open = data.filter((run) => run.status === "queued" || (run.claimed_at !== null && Date.parse(run.claimed_at) < Date.parse(staleBefore)));
  if (open.length === 0) return { changed: false, queued: data.length };

  let client: Anthropic;
  try {
    client = getAnthropic();
  } catch {
    return { changed: false, queued: data.length };
  }

  let changed = false;
  let queued = data.length;
  for (const run of open) {
    const outcome = await syncOne(client, supabase, userId, moduleId, run, staleBefore);
    if (outcome === "finished") {
      changed = true;
      queued--;
    }
  }
  return { changed, queued };
}

type Outcome = "finished" | "pending" | "skipped";

async function syncOne(client: Anthropic, supabase: SupabaseClient, userId: string, moduleId: string, run: PendingRun, staleBefore: string): Promise<Outcome> {
  const fail = async (reason: string, usage?: { input: number; output: number }) => {
    await supabase
      .from("ai_runs")
      .update({
        status: "failed",
        error: reason,
        cost_usd: usage ? estimateCostUsd(usage.input, usage.output) : 0,
        input_tokens: usage?.input ?? null,
        output_tokens: usage?.output ?? null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    await deleteProviderFiles(client, run.provider_file_ids);
  };

  if (!run.provider_batch_id) {
    await fail("Kein Auftrag angelegt (Abbruch beim Start).");
    return "finished";
  }

  let ended: boolean;
  try {
    ended = (await client.messages.batches.retrieve(run.provider_batch_id)).processing_status === "ended";
  } catch {
    return "pending";
  }
  if (!ended) return "pending";

  // whoever flips the row processes the result; a stale claim may be taken over
  let claim = supabase.from("ai_runs").update({ status: "processing", claimed_at: new Date().toISOString() }).eq("id", run.id);
  claim = run.status === "queued" ? claim.eq("status", "queued") : claim.eq("status", "processing").lt("claimed_at", staleBefore);
  const { data: claimed } = await claim.select("id");
  if (!claimed || claimed.length === 0) return "skipped";

  try {
    let found: Anthropic.Messages.MessageBatchIndividualResponse | null = null;
    for await (const item of await client.messages.batches.results(run.provider_batch_id)) {
      if (item.custom_id === run.id) {
        found = item;
        break;
      }
    }
    if (!found) {
      await fail("Der Auftrag enthält kein Ergebnis für diesen Durchlauf.");
      return "finished";
    }
    const result = found.result;
    if (result.type === "errored") {
      await fail(`Die API meldet einen Fehler: ${result.error.error.message}`);
      return "finished";
    }
    if (result.type === "expired") {
      await fail("Der Auftrag ist abgelaufen, bevor er verarbeitet wurde. Nochmals starten.");
      return "finished";
    }
    if (result.type === "canceled") {
      await fail("Der Auftrag wurde abgebrochen.");
      return "finished";
    }

    const message = result.message;
    const usage = { input: message.usage.input_tokens, output: message.usage.output_tokens };
    const extracted = extractOutput(message);
    if (!extracted.ok) {
      await fail(extracted.error, usage);
      return "finished";
    }

    const drafts = draftsFromOutput(extracted.output, { id: run.id, filenames: run.documents.map((d) => d.filename) });
    const { data: last } = await supabase.from("exercises").select("position").eq("module_id", moduleId).order("position", { ascending: false }).limit(1).maybeSingle<{ position: number }>();
    const base = last?.position ?? 0;
    const rows = drafts.exercises.map((exercise, i) => ({
      ...exerciseRow(exercise),
      user_id: userId,
      module_id: moduleId,
      external_id: exercise.external_id,
      position: base + i + 1,
      status: "draft",
      ai_run_id: run.id,
    }));
    if (rows.length > 0) {
      const { error } = await supabase.from("exercises").upsert(rows, { onConflict: "user_id,external_id" });
      if (error) throw new Error(describeDbError(error));
    }

    const skipped = drafts.invalid[0];
    const summary = [extracted.output.summary.trim(), skipped ? `${drafts.invalid.length} Einträge übersprungen (Eintrag ${skipped.index}: ${skipped.reason}).` : null].filter(Boolean).join(" ");
    await supabase
      .from("ai_runs")
      .update({
        status: "done",
        exercises_created: rows.length,
        input_tokens: usage.input,
        output_tokens: usage.output,
        cost_usd: estimateCostUsd(usage.input, usage.output),
        summary: summary || null,
        error: rows.length === 0 ? "Keine Aufgaben gefunden." : null,
        finished_at: new Date().toISOString(),
      })
      .eq("id", run.id);
    await deleteProviderFiles(client, run.provider_file_ids);
    return "finished";
  } catch (e) {
    // keep the claim: after the stale timeout the next sync reads the result again (upserts are idempotent)
    await supabase.from("ai_runs").update({ error: describeAiError(e) }).eq("id", run.id);
    return "pending";
  }
}
