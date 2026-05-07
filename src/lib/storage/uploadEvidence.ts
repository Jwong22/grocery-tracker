import type { SupabaseClient } from "@supabase/supabase-js";

const BUCKET = "receipts";
const MAX_BYTES = 10 * 1024 * 1024;

function sanitizeName(name: string): string {
  return name
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/_+/g, "_")
    .slice(0, 80);
}

export type EvidenceUploadResult = {
  paths: string[];
  errors: string[];
};

// Uploads each File to receipts/{userId}/{uuid}-{filename} and returns the
// resulting storage paths. Works in both browser and server contexts —
// caller supplies the Supabase client.
export async function uploadEvidenceFiles(
  supabase: SupabaseClient,
  userId: string,
  files: File[],
): Promise<EvidenceUploadResult> {
  const paths: string[] = [];
  const errors: string[] = [];

  for (const f of files) {
    if (!(f instanceof File) || f.size === 0) continue;
    if (f.size > MAX_BYTES) {
      errors.push(`${f.name}: too large (max 10 MB)`);
      continue;
    }
    const id = crypto.randomUUID();
    const safe = sanitizeName(f.name);
    const path = `${userId}/${id}-${safe}`;
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(path, f, {
        contentType: f.type || "application/octet-stream",
        upsert: false,
      });
    if (error) {
      errors.push(`${f.name}: ${error.message}`);
      continue;
    }
    paths.push(path);
  }

  return { paths, errors };
}
