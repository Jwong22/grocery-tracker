-- 0009_price_entry_quantity.sql
-- Record how many units a price entry covers — e.g. a store bundles 2 boxes
-- into one pack at a promo price. This is informational only: it is NOT used
-- in the cheapest-price comparison (which still uses price_myr and
-- pack_size_g_observed). Independent of any purchase quantity.

alter table price_entries
  add column if not exists qty_observed numeric not null default 1
    check (qty_observed > 0);
