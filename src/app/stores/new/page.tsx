import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Field } from "@/components/ui/Field";
import { createStoreSchema } from "@/lib/zod/schemas";

async function createStub(formData: FormData) {
  "use server";
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const parsed = createStoreSchema.safeParse({
    name: formData.get("name"),
  });
  if (!parsed.success) {
    redirect("/stores/new?err=name");
  }
  const { data, error } = await supabase
    .from("stores")
    .insert({ name: parsed.data.name })
    .select("id")
    .single();
  if (error || !data) redirect("/stores/new?err=create");
  redirect(`/stores/${data.id}`);
}

export default async function NewStorePage({
  searchParams,
}: {
  searchParams: Promise<{ err?: string }>;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/signin");

  const { err } = await searchParams;
  const errMsg =
    err === "name"
      ? "Please enter a store name (2+ characters)."
      : err === "create"
        ? "Could not create the store. Try again."
        : null;

  return (
    <div className="space-y-6 max-w-md">
      <header>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          New store
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Pick a name first. You&rsquo;ll set the location, mall, and unit on
          the next screen.
        </p>
      </header>

      <form action={createStub} className="space-y-4">
        <Field label="Store name" required error={errMsg ?? undefined}>
          {(p) => (
            <Input
              {...p}
              name="name"
              required
              placeholder="e.g. NSK Pandan Indah"
              autoFocus
            />
          )}
        </Field>
        <Button type="submit" size="lg" block>
          Continue
        </Button>
      </form>
    </div>
  );
}
