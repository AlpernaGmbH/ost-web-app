"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { documentExists, registerDocument } from "@/app/actions/documents";
import { createClient } from "@/lib/supabase/browser";
import { buttonClass } from "./ui";

const MAX_BYTES = 50 * 1024 * 1024; // bucket limit on the Supabase free plan

async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

// Storage keys reject umlauts and most punctuation; the original name is kept in the database.
const safeName = (name: string) => name.replace(/[^A-Za-z0-9._-]+/g, "_").slice(-100);

export function UploadButton({
  moduleId,
  lectureId = null,
  userId,
  label = "Datei hochladen",
}: {
  moduleId: string;
  lectureId?: string | null;
  userId: string;
  label?: string;
}) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState<{ ok: boolean; text: string }[]>([]);

  async function uploadOne(file: File): Promise<{ ok: boolean; text: string }> {
    if (file.size > MAX_BYTES) return { ok: false, text: `${file.name}: grösser als 50 MB` };
    const sha256 = await sha256Hex(file);
    if (await documentExists(moduleId, sha256)) return { ok: false, text: `${file.name}: schon vorhanden` };

    const supabase = createClient();
    const storagePath = `${userId}/${moduleId}/${crypto.randomUUID()}-${safeName(file.name)}`;
    const { error } = await supabase.storage
      .from("documents")
      .upload(storagePath, file, { contentType: file.type || "application/octet-stream", upsert: false });
    if (error) return { ok: false, text: `${file.name}: ${error.message}` };

    const result = await registerDocument({
      moduleId,
      lectureId,
      storagePath,
      filename: file.name,
      mime: file.type || null,
      sizeBytes: file.size,
      sha256,
    });
    if (!result.ok) {
      await supabase.storage.from("documents").remove([storagePath]); // do not leave an orphan behind
      return { ok: false, text: `${file.name}: ${result.message ?? "Fehler"}` };
    }
    return { ok: true, text: `${file.name}: hochgeladen` };
  }

  async function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (files.length === 0) return;
    setBusy(true);
    setMessages([]);
    const results: { ok: boolean; text: string }[] = [];
    for (const file of files) {
      try {
        results.push(await uploadOne(file));
      } catch (err) {
        results.push({ ok: false, text: `${file.name}: ${err instanceof Error ? err.message : "Fehler"}` });
      }
      setMessages([...results]);
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="space-y-2">
      <input ref={input} type="file" multiple onChange={onChange} className="sr-only" data-testid="file-input" />
      <button type="button" disabled={busy} onClick={() => input.current?.click()} className={buttonClass("primary")}>
        {busy ? "Lädt hoch …" : label}
      </button>
      {messages.map((m, i) => (
        <p key={i} role="status" className={`text-sm ${m.ok ? "text-success" : "text-danger"}`}>
          {m.text}
        </p>
      ))}
    </div>
  );
}
