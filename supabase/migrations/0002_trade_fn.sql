-- ============================================================================
--  apply_trade — atomic settlement of a single trade.
--
--  The authoritative pricing math lives in TypeScript (/lib/amm, unit-tested).
--  The server action computes the quote, then calls this function to APPLY it
--  atomically. This function:
--    • locks the artist row,
--    • re-checks shares_outstanding matches what the quote was priced against
--      (optimistic concurrency — the action retries on mismatch),
--    • validates balance (buy) / shares held (sell),
--    • updates balance + holding + shares_outstanding,
--    • appends the transaction and a price_history row,
--  all inside one transaction.
--
--  SECURITY: revoked from anon/authenticated. Only the service role (used by
--  the server action) may execute it.
-- ============================================================================

create or replace function public.apply_trade(
  p_user            uuid,
  p_artist          uuid,
  p_type            tx_type,
  p_shares          integer,
  p_price_per_share numeric,
  p_gross           numeric,
  p_fee             numeric,
  p_total           numeric,     -- debit (buy) or credit (sell)
  p_expected_s      integer,     -- shares_outstanding the quote was priced at
  p_new_s           integer,     -- shares_outstanding after the trade
  p_spot_after      numeric      -- spot price after, for price_history
) returns numeric                -- returns the user's new coin_balance
language plpgsql
security definer set search_path = public
as $$
declare
  v_current_s integer;
  v_balance   numeric;
  v_shares    integer;
  v_avg       numeric;
  v_new_bal   numeric;
begin
  if p_shares <= 0 then
    raise exception 'INVALID_QTY';
  end if;

  -- Lock the artist row so concurrent trades serialize on the curve.
  select shares_outstanding into v_current_s
  from public.artists where id = p_artist for update;
  if not found then
    raise exception 'ARTIST_NOT_FOUND';
  end if;

  -- Optimistic concurrency: the quote must have been priced at the current S.
  if v_current_s <> p_expected_s then
    raise exception 'STALE_PRICE';
  end if;

  if p_type = 'buy' then
    select coin_balance into v_balance from public.profiles
      where id = p_user for update;
    if v_balance < p_total then
      raise exception 'INSUFFICIENT_FUNDS';
    end if;

    v_new_bal := v_balance - p_total;
    update public.profiles set coin_balance = v_new_bal where id = p_user;

    -- Upsert holding; cost basis includes the fee actually paid.
    select shares, avg_cost into v_shares, v_avg from public.holdings
      where user_id = p_user and artist_id = p_artist for update;
    if found then
      update public.holdings
        set avg_cost = (v_shares * v_avg + p_total) / (v_shares + p_shares),
            shares   = v_shares + p_shares
        where user_id = p_user and artist_id = p_artist;
    else
      insert into public.holdings (user_id, artist_id, shares, avg_cost)
        values (p_user, p_artist, p_shares, p_total / p_shares);
    end if;

  else -- sell
    select shares, avg_cost into v_shares, v_avg from public.holdings
      where user_id = p_user and artist_id = p_artist for update;
    if not found or v_shares < p_shares then
      raise exception 'INSUFFICIENT_SHARES';
    end if;

    select coin_balance into v_balance from public.profiles
      where id = p_user for update;
    v_new_bal := v_balance + p_total;
    update public.profiles set coin_balance = v_new_bal where id = p_user;

    if v_shares = p_shares then
      delete from public.holdings where user_id = p_user and artist_id = p_artist;
    else
      update public.holdings set shares = v_shares - p_shares  -- avg_cost unchanged
        where user_id = p_user and artist_id = p_artist;
    end if;
  end if;

  -- Apply the new curve position.
  update public.artists set shares_outstanding = p_new_s where id = p_artist;

  -- Log the trade and the resulting spot price.
  insert into public.transactions
    (user_id, artist_id, type, shares, price_per_share, gross, fee)
    values (p_user, p_artist, p_type, p_shares, p_price_per_share, p_gross, p_fee);

  insert into public.price_history (artist_id, price)
    values (p_artist, p_spot_after);

  return v_new_bal;
end;
$$;

revoke all on function public.apply_trade(
  uuid, uuid, tx_type, integer, numeric, numeric, numeric, numeric, integer, integer, numeric
) from public, anon, authenticated;
