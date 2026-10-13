// Unpacks a ZIP in the browser so a whole folder of course material uploads in one go (pure, no I/O).
import { unzipSync } from "fflate";

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  txt: "text/plain",
  md: "text/markdown",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

export const isZip = (file: Pick<File, "name" | "type">) => /\.zip$/i.test(file.name) || file.type === "application/zip" || file.type === "application/x-zip-compressed";

/** Operating-system litter and folders are not documents. */
export function isJunkEntry(path: string): boolean {
  const name = path.split("/").pop() ?? "";
  return path.endsWith("/") || path.startsWith("__MACOSX/") || path.includes("/__MACOSX/") || name === "" || name.startsWith(".") || name === "Thumbs.db" || name === "desktop.ini";
}

export function mimeFor(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

/** The files inside an archive, flattened (folders dropped from the name), in archive order. Throws on a broken ZIP. */
export function filesFromZip(bytes: Uint8Array): File[] {
  const entries = unzipSync(bytes, { filter: (entry) => !isJunkEntry(entry.name) });
  return Object.entries(entries).map(([path, data]) => {
    const name = path.split("/").pop() ?? path;
    return new File([data as BlobPart], name, { type: mimeFor(name) });
  });
}
