"use client";

import { Loader2, Terminal } from "lucide-react";
import type { SdkLogEntry } from "../hooks/useTaurus";

interface Props {
  entries: SdkLogEntry[];
}

function relativeTime(ts: number): string {
  const d = Date.now() - ts;
  if (d < 2000) return "just now";
  if (d < 60_000) return `${Math.floor(d / 1000)}s ago`;
  if (d < 3_600_000) return `${Math.floor(d / 60_000)}m ago`;
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

const S_COLOR = { pending: "#00F2FE", success: "#10B981", error: "#F87171" };
const S_ICON  = { pending: "·",       success: "✓",        error: "✗" };

export default function SdkActivityLog({ entries }: Props) {
  const successCount = entries.filter(e => e.status === "success").length;
  const pendingCount = entries.filter(e => e.status === "pending").length;

  return (
    <div className="glass-card" style={{ overflow: "hidden" }}>
      {/* ── Header ── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 18px",
        background: "rgba(0,0,0,0.22)",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Terminal size={16} color="#00F2FE" />
          <span style={{ fontFamily: "monospace", fontWeight: 900, fontSize: "14px", color: "#00F2FE" }}>
            SDK Activity
          </span>
          {pendingCount > 0 && (
            <Loader2 size={12} style={{ color: "#00F2FE", animation: "spin 1s linear infinite" }} />
          )}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{
            background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
            color: "#10B981", borderRadius: 20, padding: "2px 9px",
            fontSize: "10px", fontFamily: "monospace",
          }}>
            {successCount} ok
          </span>
          <span style={{
            background: "rgba(0,242,254,0.07)", border: "1px solid rgba(0,242,254,0.15)",
            color: "#00F2FE", borderRadius: 20, padding: "2px 9px",
            fontSize: "10px", fontFamily: "monospace",
          }}>
            {entries.length} total
          </span>
        </div>
      </div>

      {/* ── Log entries ── */}
      <div style={{ maxHeight: "520px", overflowY: "auto" }}>
        {entries.length === 0 ? (
          <div style={{ padding: "48px 16px", textAlign: "center" }}>
            <Terminal size={28} color="rgba(255,255,255,0.1)" style={{ margin: "0 auto 10px" }} />
            <p style={{ color: "rgba(255,255,255,0.22)", fontSize: "12px", fontFamily: "monospace" }}>
              No SDK calls yet.
            </p>
            <p style={{ color: "rgba(255,255,255,0.14)", fontSize: "11px", marginTop: 4 }}>
              Swap tokens or explore the pool to see live calls here.
            </p>
          </div>
        ) : (
          entries.map((entry, idx) => {
            const color = S_COLOR[entry.status];
            return (
              <div key={entry.id} style={{
                display: "flex", alignItems: "flex-start", gap: 10,
                padding: "9px 16px",
                borderBottom: idx < entries.length - 1 ? "1px solid rgba(255,255,255,0.04)" : "none",
                background: entry.status === "pending" ? "rgba(0,242,254,0.025)" : "transparent",
              }}>
                {/* Status icon */}
                <div style={{ flexShrink: 0, width: 18, textAlign: "center", marginTop: 1 }}>
                  {entry.status === "pending" ? (
                    <Loader2 size={12} style={{ color: S_COLOR.pending, animation: "spin 1s linear infinite" }} />
                  ) : (
                    <span style={{
                      display: "inline-block", width: 14, height: 14,
                      borderRadius: "50%", background: color,
                      lineHeight: "14px", textAlign: "center",
                      fontSize: "8px", color: "#0a0a0e", fontWeight: 900,
                    }}>
                      {S_ICON[entry.status]}
                    </span>
                  )}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                    <code style={{ color: "#A3E635", fontFamily: "monospace", fontSize: "12px", fontWeight: 700 }}>
                      {entry.method}()
                    </code>
                    <span style={{
                      background: `${color}18`,
                      border: `1px solid ${color}35`,
                      color, borderRadius: 4,
                      padding: "0 5px", fontSize: "9px", fontFamily: "monospace",
                    }}>
                      {entry.status}
                    </span>
                    {entry.duration != null && (
                      <span style={{ color: "rgba(255,255,255,0.28)", fontSize: "10px", fontFamily: "monospace" }}>
                        {entry.duration}ms
                      </span>
                    )}
                  </div>
                  {entry.error && (
                    <div style={{
                      color: "#F87171", fontSize: "10px", marginTop: 3,
                      fontFamily: "monospace", opacity: 0.8,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {entry.error}
                    </div>
                  )}
                </div>

                {/* Timestamp */}
                <span style={{
                  flexShrink: 0, color: "rgba(255,255,255,0.2)",
                  fontSize: "10px", fontFamily: "monospace", marginTop: 2,
                }}>
                  {relativeTime(entry.startedAt)}
                </span>
              </div>
            );
          })
        )}
      </div>

      {/* ── SDK reference guide ── */}
      <div style={{
        borderTop: "1px solid rgba(255,255,255,0.06)",
        padding: "14px 18px",
        background: "rgba(0,0,0,0.15)",
      }}>
        <p style={{ color: "rgba(255,255,255,0.3)", fontSize: "10px", fontFamily: "monospace", marginBottom: 8 }}>
          // SDK CALL MAP — what each UI action triggers:
        </p>
        {[
          { ui: "Quote preview",     call: "client.quote()",                     color: "#7DD3FC" },
          { ui: "Swap tokens",       call: "client.buildSwapTxns()",             color: "#A3E635" },
          { ui: "Pool state poll",   call: "client.getPoolState()",              color: "#00F2FE" },
          { ui: "Depeg preview",     call: "client.tickParamsFromDepegPrice()",  color: "#F59E0B" },
          { ui: "Efficiency calc",   call: "client.getCapitalEfficiency()",      color: "#F59E0B" },
          { ui: "Add liquidity",     call: "client.buildAddLiquidityTxns()",     color: "#D946EF" },
          { ui: "Remove liquidity",  call: "client.buildRemoveLiquidityTxns()", color: "#F87171" },
          { ui: "Claim fees",        call: "client.buildClaimFeesTxns()",        color: "#10B981" },
        ].map(row => (
          <div key={row.call} style={{
            display: "flex", alignItems: "center", gap: 8, marginBottom: 4,
          }}>
            <span style={{ color: "rgba(255,255,255,0.25)", fontSize: "10px", width: 110 }}>{row.ui}</span>
            <span style={{ color: "rgba(255,255,255,0.18)", fontSize: "10px" }}>→</span>
            <code style={{ color: row.color, fontSize: "10px", fontFamily: "monospace" }}>{row.call}</code>
          </div>
        ))}
      </div>
    </div>
  );
}
