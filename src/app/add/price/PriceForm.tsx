"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Combobox, type ComboboxItem } from "@/components/Combobox";
import { StoreMapPicker } from "@/components/map/StoreMapPicker";
import { EvidenceUpload } from "@/components/EvidenceUpload";
import { useToast } from "@/components/Toaster";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Field } from "@/components/ui/Field";
import { searchProducts, searchStores, type StoreRow } from "@/lib/queries/catalog";
import { PACK_TYPES } from "@/lib/zod/schemas";
import {
  createProductAction,
  createStoreAction,
  submitPriceEntry,
  type PriceFormState,
} from "./actions";

const initialState: PriceFormState = { ok: false };

export function PriceForm() {
  const [state, formAction, pending] = useActionState(
    submitPriceEntry,
    initialState,
  );
  const [product, setProduct] = useState<ComboboxItem | null>(null);
  const [store, setStore] = useState<ComboboxItem | null>(null);
  const [mapOpen, setMapOpen] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [alsoBought, setAlsoBought] = useState(false);
  const handledRef = useRef<PriceFormState | null>(null);
  const { success, error: toastError } = useToast();

  const productSearch = useCallback(
    async (q: string): Promise<ComboboxItem[]> => {
      const rows = await searchProducts(q);
      return rows.map((r) => ({
        id: r.id,
        label: r.canonical_name,
        hint: r.category,
      }));
    },
    [],
  );

  const storeSearch = useCallback(
    async (q: string): Promise<ComboboxItem[]> => {
      const rows = await searchStores(q);
      return rows.map((r) => ({
        id: r.id,
        label: r.name,
        hint: storeHint(r),
      }));
    },
    [],
  );

  const productCreate = useCallback(
    async (name: string) => createProductAction(name),
    [],
  );

  const storeCreate = useCallback(
    async (name: string) => createStoreAction(name),
    [],
  );

  useEffect(() => {
    if (state.ok && handledRef.current !== state) {
      handledRef.current = state;
      setProduct(null);
      setStore(null);
      setFormKey((k) => k + 1);
      success(state.message ?? "Price saved");
    } else if (!state.ok && state.message && handledRef.current !== state) {
      handledRef.current = state;
      toastError(state.message);
    }
  }, [state, success, toastError]);

  return (
    <form key={formKey} action={formAction} className="space-y-5">
      <input type="hidden" name="product_id" value={product?.id ?? ""} />
      <input type="hidden" name="store_id" value={store?.id ?? ""} />

      <Combobox
        label="Product"
        placeholder="e.g. carrot"
        value={product}
        onChange={setProduct}
        search={productSearch}
        onCreate={productCreate}
        required
        error={state.errors?.product_id?.[0]}
      />

      <div className="space-y-2">
        <Combobox
          label="Store"
          placeholder="e.g. NSK Pandan Indah"
          value={store}
          onChange={setStore}
          search={storeSearch}
          onCreate={storeCreate}
          required
          error={state.errors?.store_id?.[0]}
        />
        <div className="flex items-center justify-between gap-2 text-xs">
          {store ? (
            <Link
              href={`/stores/${store.id}`}
              className="inline-flex items-center gap-1 text-accent hover:underline"
            >
              <PinIcon /> Edit store / set location
            </Link>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="inline-flex items-center gap-1 rounded-md border border-border bg-card px-2 py-1 text-foreground hover:bg-muted transition-colors"
          >
            <MapIcon /> Pick on map
          </button>
        </div>
      </div>

      <StoreMapPicker
        open={mapOpen}
        onClose={() => setMapOpen(false)}
        onPick={(picked) => setStore(picked)}
      />

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Price (MYR)"
          required
          error={state.errors?.price_myr?.[0]}
        >
          {(p) => (
            <Input
              {...p}
              name="price_myr"
              type="number"
              step="0.01"
              min="0"
              inputMode="decimal"
              required
              invalid={Boolean(state.errors?.price_myr?.[0])}
              placeholder="0.00"
            />
          )}
        </Field>
        <Field
          label="Pack size (g)"
          error={state.errors?.pack_size_g?.[0]}
        >
          {(p) => (
            <Input
              {...p}
              name="pack_size_g"
              type="number"
              step="1"
              min="0"
              inputMode="decimal"
              placeholder="optional"
              invalid={Boolean(state.errors?.pack_size_g?.[0])}
            />
          )}
        </Field>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Pack type">
          {(p) => (
            <Dropdown
              {...p}
              name="pack_type"
              defaultValue="loose"
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
              defaultValue={localDateTimeNow()}
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
            invalid={Boolean(state.errors?.notes?.[0])}
          />
        )}
      </Field>

      {/* Toggle: also log as a purchase */}
      <div className="rounded-lg border border-border bg-card p-3 space-y-3">
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            name="also_bought"
            checked={alsoBought}
            onChange={(e) => setAlsoBought(e.target.checked)}
            className="h-4 w-4 rounded border-border text-primary focus:ring-ring"
          />
          <div>
            <span className="text-sm font-medium text-foreground">
              I bought this
            </span>
            <p className="text-xs text-muted-foreground">
              Also log as a purchase — we&rsquo;ll tell you if it was the cheapest
            </p>
          </div>
        </label>
        {alsoBought && (
          <div className="space-y-3">
            <Field label="Quantity" error={state.errors?.qty?.[0]}>
              {(p) => (
                <Input
                  {...p}
                  name="qty"
                  type="number"
                  step="1"
                  min="1"
                  inputMode="numeric"
                  defaultValue="1"
                  placeholder="1"
                  invalid={Boolean(state.errors?.qty?.[0])}
                />
              )}
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field
                label="Coupon / discount (MYR)"
                error={state.errors?.discount_myr?.[0]}
              >
                {(p) => (
                  <Input
                    {...p}
                    name="discount_myr"
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    placeholder="optional"
                    invalid={Boolean(state.errors?.discount_myr?.[0])}
                  />
                )}
              </Field>
              <Field
                label="Rounding adj. (MYR)"
                error={state.errors?.rounding_myr?.[0]}
              >
                {(p) => (
                  <Input
                    {...p}
                    name="rounding_myr"
                    type="number"
                    step="0.01"
                    inputMode="decimal"
                    placeholder="e.g. 0.02"
                    invalid={Boolean(state.errors?.rounding_myr?.[0])}
                  />
                )}
              </Field>
            </div>
            <p className="text-xs text-muted-foreground">
              Records what you actually paid (price × qty − coupon + rounding).
              Leave blank if none.
            </p>
          </div>
        )}
      </div>

      <EvidenceUpload />

      <Button type="submit" size="lg" block disabled={pending}>
        {pending ? "Saving…" : alsoBought ? "Save price & purchase" : "Save entry"}
      </Button>
    </form>
  );
}

function PinIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3 w-3"
      aria-hidden
    >
      <path d="M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0 1 18 0z" />
      <circle cx="12" cy="10" r="3" />
    </svg>
  );
}

function MapIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-3.5 w-3.5"
      aria-hidden
    >
      <polygon points="1 6 8 3 16 6 23 3 23 18 16 21 8 18 1 21 1 6" />
      <line x1="8" y1="3" x2="8" y2="18" />
      <line x1="16" y1="6" x2="16" y2="21" />
    </svg>
  );
}

function storeHint(r: StoreRow): string | null {
  const bits: string[] = [];
  if (r.parent_name) bits.push(r.parent_name);
  if (r.unit) bits.push(r.unit);
  if (bits.length === 0) {
    if (r.chain) return r.chain;
    return r.address;
  }
  return bits.join(" · ");
}

function localDateTimeNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
