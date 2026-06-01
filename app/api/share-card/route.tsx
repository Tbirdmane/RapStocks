import { ImageResponse } from "next/og";
import { createClient } from "@/lib/supabase/server";
import { getPortfolio, getWeeklyChange, topHolding, hasCalledIt } from "@/lib/portfolio";
import { colors } from "@/lib/design-tokens";
import { APP_NAME, CURRENCY_NAME } from "@/lib/config";

// Node runtime so we can use the Supabase clients (cookies + service role).
export const runtime = "nodejs";

const W = 1080;
const H = 1350;

function fmt(n: number) {
  return Math.round(n).toLocaleString("en-US");
}

export async function GET() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Defaults for the signed-out / empty case.
  let handle = "player";
  let total = 0;
  let weeklyPct = 0;
  let top: { name: string; plPct: number } | null = null;
  let called = false;

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", user.id)
      .single();
    handle = profile?.handle ?? "player";

    const p = await getPortfolio(user.id);
    total = p.totalValue;
    weeklyPct = (await getWeeklyChange(user.id, total)).pct;
    const th = topHolding(p);
    top = th ? { name: th.name, plPct: th.plPct } : null;
    called = hasCalledIt(p);
  }

  const up = weeklyPct >= 0;
  const moveColor = up ? colors.up : colors.down;

  return new ImageResponse(
    (
      <div
        style={{
          width: W,
          height: H,
          display: "flex",
          flexDirection: "column",
          background: colors.bg,
          padding: 72,
          color: colors.text,
          fontFamily: "sans-serif",
        }}
      >
        {/* Brand row */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 44, fontWeight: 800, color: colors.accent }}>{APP_NAME}</div>
          {called && (
            <div
              style={{
                display: "flex",
                background: colors.gold,
                color: "#000",
                fontWeight: 800,
                fontSize: 30,
                padding: "12px 26px",
                borderRadius: 999,
              }}
            >
              CALLED IT
            </div>
          )}
        </div>

        {/* Handle */}
        <div style={{ display: "flex", marginTop: 90, fontSize: 56, color: colors.textMuted }}>
          @{handle}
        </div>

        {/* Total value — the hero */}
        <div style={{ display: "flex", flexDirection: "column", marginTop: 16 }}>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 20 }}>
            <div style={{ fontSize: 168, fontWeight: 800, lineHeight: 1 }}>{fmt(total)}</div>
            <div style={{ fontSize: 52, fontWeight: 700, color: colors.textMuted, paddingBottom: 18 }}>
              {CURRENCY_NAME}
            </div>
          </div>
          <div style={{ display: "flex", fontSize: 40, color: colors.textFaint, marginTop: 8 }}>
            Portfolio value
          </div>
        </div>

        {/* Weekly change */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            marginTop: 70,
            background: up ? colors.upSoft : colors.downSoft,
            color: moveColor,
            alignSelf: "flex-start",
            padding: "20px 36px",
            borderRadius: 24,
            fontSize: 56,
            fontWeight: 800,
          }}
        >
          {up ? "▲" : "▼"} {Math.abs(weeklyPct * 100).toFixed(1)}% this week
        </div>

        {/* Spacer */}
        <div style={{ display: "flex", flex: 1 }} />

        {/* Top holding */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: colors.surface,
            border: `2px solid ${colors.border}`,
            borderRadius: 28,
            padding: 44,
          }}
        >
          <div style={{ display: "flex", fontSize: 36, color: colors.textFaint }}>TOP HOLDING</div>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 14 }}>
            <div style={{ fontSize: 64, fontWeight: 800 }}>{top ? top.name : "No holdings yet"}</div>
            {top && (
              <div style={{ fontSize: 60, fontWeight: 800, color: top.plPct >= 0 ? colors.up : colors.down }}>
                {top.plPct >= 0 ? "+" : ""}
                {(top.plPct * 100).toFixed(0)}%
              </div>
            )}
          </div>
        </div>

        <div style={{ display: "flex", justifyContent: "center", marginTop: 40, fontSize: 32, color: colors.textFaint }}>
          Draft the next big rapper before they blow up
        </div>
      </div>
    ),
    { width: W, height: H }
  );
}
