import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

export async function findOrCreateProductByName(
  supabase: SupabaseClient,
  name: string,
): Promise<{ id: string } | { error: string }> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Product name too short" };

  const { data: existing, error: findErr } = await supabase
    .from("products")
    .select("id")
    .ilike("canonical_name", trimmed)
    .limit(1)
    .maybeSingle();
  if (findErr) return { error: `Product lookup: ${findErr.message}` };
  if (existing?.id) return { id: existing.id };

  const { data: created, error: createErr } = await supabase
    .from("products")
    .insert({ canonical_name: trimmed })
    .select("id")
    .single();
  if (createErr) return { error: `Product create: ${createErr.message}` };
  return { id: created.id };
}

export async function findOrCreateStoreByName(
  supabase: SupabaseClient,
  name: string,
): Promise<{ id: string } | { error: string }> {
  const trimmed = name.trim();
  if (trimmed.length < 2) return { error: "Store name too short" };

  // Case-insensitive exact match first.
  const { data: existing, error: findErr } = await supabase
    .from("stores")
    .select("id")
    .ilike("name", trimmed)
    .limit(1)
    .maybeSingle();
  if (findErr) return { error: `Store lookup: ${findErr.message}` };
  if (existing?.id) return { id: existing.id };

  // Fallback: match names that differ only by internal whitespace/case
  // (e.g. "mid valley" vs "Mid valley" vs "midvalley"). Fetch candidates that
  // share the first token and compare normalized (lowercased, spaces removed).
  const norm = (s: string) => s.toLowerCase().replace(/\s+/g, "");
  const firstToken = trimmed.split(/\s+/)[0];
  if (firstToken.length >= 2) {
    const { data: candidates } = await supabase
      .from("stores")
      .select("id, name")
      .ilike("name", `%${firstToken}%`)
      .limit(50);
    const target = norm(trimmed);
    const hit = (candidates ?? []).find((c) => norm(c.name) === target);
    if (hit?.id) return { id: hit.id };
  }

  const { data: created, error: createErr } = await supabase
    .from("stores")
    .insert({ name: trimmed })
    .select("id")
    .single();
  if (createErr) return { error: `Store create: ${createErr.message}` };
  return { id: created.id };
}
