"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/Toaster";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Field } from "@/components/ui/Field";
import { PACK_TYPES } from "@/lib/zod/schemas";
import {
  updatePriceEntry,
  deletePriceEntry,
  type PriceFormState,
} from "@/app/add/price/actions";

const initialState: PriceFormState = { ok: false };

type Defaults = {
  price_myr: string;
  pack_size_g: string;
  qty_observed: string;
  pack_type: string;
  brand: string;
  origin_country: string;
  observed_at: string;
  notes: string;
};

export function PriceEditForm({
  entryId,
  defaults,
}: {
  entryId: string;
  defaults: Defaults;
}) {
  const action = updatePriceEntry.bind(null, entryId);
  const [state, formAction, pending] = useActionState(action, initialState);
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const handledRef = useRef<PriceFormState | null>(null);
  const [deleting, startDelete] = useTransition();
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => {
    if (handledRef.current === state) return;
    if (state.ok && state.message) {
      handledRef.current = state;
      success(state.message);
      const t = setTimeout(() => router.push(`/prices/${entryId}`), 600);
      return () => clearTimeout(t);
    } else if (!state.ok && state.message) {
      handledRef.current = state;
      toastError(state.message);
    }
  }, [state, success, toastError, router, entryId]);

  const onDelete = () => {
    startDelete(async () => {
      const res = await deletePriceEntry(entryId);
      if (res.ok) {
        success("Price entry deleted.");
        router.push("/prices");
      } else {
        toastError(res.message ?? "Couldn't delete.");
        setConfirmDelete(false);
      }
    });
  };

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Price (MYR)" required error={state.errors?.price_myr?.[0]}>
          {(p) => (
            <Input
              {...p}
              name="price_myr"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              required
              defaultValue={defaults.price_myr}
              invalid={Boolean(state.errors?.price_myr?.[0])}
            />
          )}
        </Field>
        <Field label="Pack size (g)" error={state.errors?.pack_size_g?.[0]}>
          {(p) => (
            <Input
              {...p}
              name="pack_size_g"
              type="number"
              step="1"
              min="0"
              inputMode="decimal"
              placeholder="optional"
              defaultValue={defaults.pack_size_g}
              invalid={Boolean(state.errors?.pack_size_g?.[0])}
            />
          )}
        </Field>
      </div>

      <Field
        label="Quantity"
        hint="How many units this price covers. Default 1."
        error={state.errors?.qty_observed?.[0]}
      >
        {(p) => (
          <Input
            {...p}
            name="qty_observed"
            type="number"
            step="1"
            min="1"
            inputMode="numeric"
            defaultValue={defaults.qty_observed || "1"}
            invalid={Boolean(state.errors?.qty_observed?.[0])}
          />
        )}
      </Field>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Pack type">
          {(p) => (
            <Dropdown
              {...p}
              name="pack_type"
              defaultValue={defaults.pack_type || "loose"}
              options={PACK_TYPES.map((pt) => ({ value: pt, label: pt }))}
            />
          )}
        </Field>
        <Field label="Brand" error={state.errors?.brand?.[0]}>
          {(p) => (
            <Input
              {...p}
              name="brand"
              placeholder="optional"
              defaultValue={defaults.brand}
              invalid={Boolean(state.errors?.brand?.[0])}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Origin" error={state.errors?.origin_country?.[0]}>
          {(p) => (
            <Input
              {...p}
              name="origin_country"
              placeholder="e.g. Australia"
              defaultValue={defaults.origin_country}
              invalid={Boolean(state.errors?.origin_country?.[0])}
            />
          )}
        </Field>
        <Field label="Observed">
          {(p) => (
            <Input
              {...p}
              name="observed_at"
              type="datetime-local"
              defaultValue={defaults.observed_at}
            />
          )}
        </Field>
      </div>

      <Field label="Notes" error={state.errors?.notes?.[0]}>
        {(p) => (
          <Input
            {...p}
            name="notes"
            placeholder="optional"
            defaultValue={defaults.notes}
            invalid={Boolean(state.errors?.notes?.[0])}
          />
        )}
      </Field>

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Saving…" : "Save changes"}
      </Button>

      <div className="border-t border-border/60 pt-4">
        <button
          type="button"
          onClick={() => setConfirmDelete(true)}
          className="inline-flex items-center gap-1.5 text-sm text-destructive hover:underline"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
          Delete price entry
        </button>
      </div>

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this price entry?"
        description="This permanently removes the price entry. This can't be undone."
        confirmLabel="Delete"
        busy={deleting}
        onConfirm={onDelete}
        onCancel={() => setConfirmDelete(false)}
      />
    </form>
  );
}
