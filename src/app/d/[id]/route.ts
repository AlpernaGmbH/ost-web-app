import { NextResponse } from "next/server";
import { z } from "zod";
import { getUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

/** Opens a stored document through a short-lived signed URL (the bucket itself is private). */
export async function GET(request: Request, ctx: RouteContext<"/d/[id]">) {
  const user = await getUser();
  if (!user) return NextResponse.redirect(new URL("/login", request.url));

  const id = z.string().uuid().safeParse((await ctx.params).id);
  if (!id.success) return new NextResponse("Not found", { status: 404 });

  const supabase = await createClient();
  const { data: doc } = await supabase.from("documents").select("storage_path, filename").eq("id", id.data).maybeSingle();
  if (!doc) return new NextResponse("Not found", { status: 404 });

  const { data, error } = await supabase.storage.from("documents").createSignedUrl(doc.storage_path, 60);
  if (error || !data) return new NextResponse("Datei nicht verfügbar", { status: 502 });

  const response = NextResponse.redirect(data.signedUrl);
  response.headers.set("Cache-Control", "no-store");
  return response;
}
