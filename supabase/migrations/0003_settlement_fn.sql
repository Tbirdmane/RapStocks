-- ============================================================================
--  run_settlement — an "earnings day". Admin enters each artist's latest
--  monthly-listener count; this re-values every holder's position at once by
--  shifting each artist's bonding curve.
--
--  For each entry {artist_id, new_listeners}:
--    growth_pct = (new - prev) / prev            (null/0 prev -> no move)
--    move       = clamp(growth_pct * sensitivity, -max_move, +max_move)
--    base_after = base_before * (1 + move)
--  Then: update base_price + latest_monthly_listeners, log a listener_snapshot,
--  a settlement_result (auditable before/after), and a price_history row at the
--  new spot price.
--
--  Whole run is one transaction. Service-role only.
--
--  p_entries shape (jsonb):  [{ "artist_id": "...", "new_listeners": 12345 }, ...]
-- ============================================================================

create or replace function public.run_settlement(
  p_notes       text,
  p_entries     jsonb,
  p_sensitivity numeric default 1.0,
  p_max_move    numeric default 0.25
) returns uuid
language plpgsql
security definer set search_path = public
as $$
declare
  v_settlement uuid;
  v_entry      jsonb;
  v_artist_id  uuid;
  v_new        bigint;
  v_prev       bigint;
  v_growth     numeric;
  v_move       numeric;
  v_base_before numeric;
  v_base_after  numeric;
  v_k          numeric;
  v_s          integer;
begin
  insert into public.settlements (notes) values (p_notes) returning id into v_settlement;

  for v_entry in select * from jsonb_array_elements(p_entries)
  loop
    v_artist_id := (v_entry->>'artist_id')::uuid;
    v_new       := (v_entry->>'new_listeners')::bigint;

    select latest_monthly_listeners, base_price, k_coefficient, shares_outstanding
      into v_prev, v_base_before, v_k, v_s
      from public.artists where id = v_artist_id for update;
    if not found then
      continue; -- skip unknown artist ids defensively
    end if;

    if v_prev is null or v_prev = 0 then
      v_growth := null;
      v_move := 0;
    else
      v_growth := (v_new - v_prev)::numeric / v_prev;
      v_move := greatest(-p_max_move, least(p_max_move, v_growth * p_sensitivity));
    end if;

    v_base_after := v_base_before * (1 + v_move);

    update public.artists
      set base_price = v_base_after,
          latest_monthly_listeners = v_new
      where id = v_artist_id;

    insert into public.listener_snapshots (artist_id, monthly_listeners)
      values (v_artist_id, v_new);

    insert into public.settlement_results
      (settlement_id, artist_id, prev_listeners, new_listeners, growth_pct,
       base_price_before, base_price_after)
      values
      (v_settlement, v_artist_id, v_prev, v_new, v_growth,
       v_base_before, v_base_after);

    -- New spot price after the curve shift, for charts.
    insert into public.price_history (artist_id, price)
      values (v_artist_id, v_base_after + v_k * v_s);
  end loop;

  return v_settlement;
end;
$$;

revoke all on function public.run_settlement(text, jsonb, numeric, numeric)
  from public, anon, authenticated;
