import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AiRunPoller } from "@/components/ai-generate";
import { DraftReview, type DraftRow } from "@/components/draft-review";
import { Card, PageTitle } from "@/components/ui";
import { requireUser } from "@/lib/auth";
import { describeDbError } from "@/lib/db/errors";
import { parseUuidOrNotFound } from "@/lib/ids";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Entwürfe prüfen" };

export default async function DraftsPage({ params }: PageProps<"/m/[moduleId]/ex/drafts">) {
  await requireUser();
  const moduleId = parseUuidOrNotFound((await params).moduleId);
  const supabase = await createClient();
  const { data: module } = await supabase.from("modules").select("id, name").eq("id", moduleId).maybeSingle<{ id: string; name: string }>();
  if (!module) notFound();

  const [draftsRes, queuedRes] = await Promise.all([
    supabase
      .from("exercises")
      .select("id, title, topic, kind, minutes, difficulty, points, source_label, source_ref, ai_run_id")
      .eq("module_id", moduleId)
      .eq("status", "draft")
      .order("position")
      .order("created_at")
      .limit(2000)
      .returns<DraftRow[]>(),
    supabase.from("ai_runs").select("id", { count: "exact", head: true }).eq("module_id", moduleId).in("status", ["queued", "processing"]),
  ]);
  if (draftsRes.error) return <Card>{describeDbError(draftsRes.error)}</Card>;
  const drafts = draftsRes.data ?? [];

  return (
    <>
      <Link href={`/m/${moduleId}?tab=uebungen`} className="mb-4 inline-flex min-h-9 items-center font-bold text-primary-ink">
        ← Übungen
      </Link>
      <PageTitle title="Entwürfe prüfen" size="md" subtitle={module.name} />
      <div className="space-y-4">
        <AiRunPoller moduleId={moduleId} queued={queuedRes.count ?? 0} />
        {drafts.length === 0 ? (
          <Card>
            <p className="text-sm text-muted">Keine offenen Entwürfe. Neue entstehen im Tab «Übungen» unter «Aus Unterlagen erzeugen».</p>
          </Card>
        ) : (
          <DraftReview moduleId={moduleId} drafts={drafts} />
        )}
      </div>
    </>
  );
}
