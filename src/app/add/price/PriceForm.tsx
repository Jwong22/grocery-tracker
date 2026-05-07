"use client";

import { useActionState, useCallback, useEffect, useRef, useState } from "react";
import { Combobox, type ComboboxItem } from "@/components/Combobox";
import { searchProducts, searchStores } from "@/lib/queries/catalog";
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
  const [formKey, setFormKey] = useState(0);
  const handledRef = useRef<PriceFormState | null>(null);

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
        hint: r.chain ?? r.address,
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
    }
  }, [state]);

  return (
    <form key={formKey} action={formAction} className="space-y-4">
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

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Price (MYR)"
          name="price_myr"
          type="number"
          step="0.01"
          min="0"
          inputMode="decimal"
          required
          error={state.errors?.price_myr?.[0]}
        />
        <Field
          label="Pack size (g)"
          name="pack_size_g"
          type="number"
          step="1"
          min="0"
          inputMode="decimal"
          placeholder="optional"
          error={state.errors?.pack_size_g?.[0]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <SelectField
          label="Pack type"
          name="pack_type"
          defaultValue="loose"
          options={PACK_TYPES.map((p) => ({ value: p, label: p }))}
        />
        <Field
          label="Brand"
          name="brand"
          placeholder="optional"
          error={state.errors?.brand?.[0]}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="Origin"
          name="origin_country"
          placeholder="e.g. Australia"
          error={state.errors?.origin_country?.[0]}
        />
        <Field
          label="Observed"
          name="observed_at"
          type="datetime-local"
          defaultValue={localDateTimeNow()}
        />
      </div>

      <Field
        label="Notes"
        name="notes"
        placeholder="optional"
        error={state.errors?.notes?.[0]}
      />

      {state.message && (
        <p
          className={`text-sm ${
            state.ok ? "text-green-700" : "text-red-600"
          }`}
          role={state.ok ? "status" : "alert"}
        >
          {state.message}
        </p>
      )}

      <button
        type="submit"
        disabled={pending}
        className="w-full h-12 rounded-full bg-green-600 text-white font-medium hover:bg-green-700 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save price"}
      </button>
    </form>
  );
}

type FieldProps = React.InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string | null;
};

function Field({ label, error, name, ...rest }: FieldProps) {
  return (
    <label className="block space-y-1">
      <span className="block text-sm font-medium text-gray-800">
        {label}
        {rest.required && <span className="text-red-600 ml-0.5">*</span>}
      </span>
      <input
        name={name}
        {...rest}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
      />
      {error && <span className="block text-xs text-red-600">{error}</span>}
    </label>
  );
}

type SelectFieldProps = {
  label: string;
  name: string;
  defaultValue?: string;
  options: { value: string; label: string }[];
};

function SelectField({ label, name, defaultValue, options }: SelectFieldProps) {
  return (
    <label className="block space-y-1">
      <span className="block text-sm font-medium text-gray-800">{label}</span>
      <select
        name={name}
        defaultValue={defaultValue}
        className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-1 focus:ring-green-500"
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function localDateTimeNow(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
    d.getDate(),
  )}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
