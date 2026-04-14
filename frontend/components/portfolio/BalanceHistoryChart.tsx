"use client";

import { useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import type { BalancePoint } from "@/hooks/useBalanceHistory";
import { POOL_TOKEN_SYMBOLS } from "@/lib/tokenDisplay";

const TOKEN_COLORS: Record<string, string> = {
  ALGO: "#6B7FD7",
  USDC: "#2775CA",
  USDT: "#26A17B",
  USDD: "#00C9B1",
  BUSD: "#F0B90B",
  TUSD: "#7B61FF",
};

interface Props {
  data: BalancePoint[];
  /** Symbols that actually have non-zero balance */
  activeSymbols: string[];
}

export default function BalanceHistoryChart({ data, activeSymbols }: Props) {
  const [selected, setSelected] = useState<string>("All");

  const visibleTokens =
    selected === "All"
      ? activeSymbols
      : activeSymbols.includes(selected)
      ? [selected]
      : [];

  return (
    <div>
      {/* Filter pills */}
      <div className="flex flex-wrap gap-2 mb-4">
        {["All", ...activeSymbols].map((sym) => {
          const color = TOKEN_COLORS[sym];
          const isActive = selected === sym;
          return (
            <button
              key={sym}
              onClick={() => setSelected(sym)}
              className={`px-3 py-1 rounded-full text-xs font-semibold border transition-all ${
                isActive
                  ? "text-white"
                  : "border-border/40 text-muted-foreground hover:text-foreground"
              }`}
              style={
                isActive
                  ? {
                      borderColor: sym === "All" ? "hsl(70 55% 37%)" : color,
                      backgroundColor: sym === "All" ? "hsl(70 55% 37%)" : color,
                    }
                  : {}
              }
            >
              {sym}
            </button>
          );
        })}
      </div>

      {/* Chart */}
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="time"
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
              interval="preserveStartEnd"
            />
            <YAxis
              axisLine={false}
              tickLine={false}
              tick={{ fontSize: 10, fill: "hsl(240 5% 55%)" }}
              width={55}
              tickFormatter={(v) =>
                v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)
              }
            />
            <Tooltip
              contentStyle={{
                background: "hsl(240 8% 10%)",
                border: "1px solid hsl(240 6% 18%)",
                borderRadius: "12px",
                fontSize: 12,
              }}
              labelStyle={{ color: "hsl(0 0% 55%)" }}
              itemStyle={{ color: "hsl(0 0% 95%)" }}
              formatter={(v, name) => [
                typeof v === "number"
                  ? v.toLocaleString("en-US", { maximumFractionDigits: 2 })
                  : String(v),
                String(name),
              ]}
            />
            <Legend
              iconType="circle"
              iconSize={8}
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />
            {visibleTokens.map((sym) => (
              <Line
                key={sym}
                type="monotone"
                dataKey={sym}
                stroke={TOKEN_COLORS[sym] ?? "#888"}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
