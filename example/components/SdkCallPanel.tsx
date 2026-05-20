"use client";

import { useState } from "react";
import { Copy, Check, Loader2 } from "lucide-react";

export type SdkCallStatus = "idle" | "loading" | "success" | "error";

export interface SdkCallPanelProps {
  method: string;
  code: string;
  status: SdkCallStatus;
  duration?: number;
  error?: string;
}

// ── Minimal syntax tokenizer ──────────────────────────────────────────────────

type TType = "kw" | "str" | "num" | "fn" | "prop" | "cmt" | "ws" | "punc" | "plain";

const KEYWORDS = new Set([
  "await", "const", "let", "var", "return", "async", "function",
  "import", "export", "from", "new", "if", "else", "true", "false", "null",
]);

const COLORS: Record<TType, string> = {
  kw:    "#00F2FE",
  str:   "#D946EF",
  num:   "#F59E0B",
  fn:    "#A3E635",
  prop:  "#7DD3FC",
  cmt:   "rgba(255,255,255,0.28)",
  ws:    "inherit",
  punc:  "rgba(255,255,255,0.38)",
  plain: "#E2E8F0",
};

function tokenize(src: string): Array<{ t: TType; v: string }> {
  const out: Array<{ t: TType; v: string }> = [];
  let i = 0;
  while (i < src.length) {
    // comment
    if (src[i] === "/" && src[i + 1] === "/") {
      const nl = src.indexOf("\n", i);
      const end = nl === -1 ? src.length : nl;
      out.push({ t: "cmt", v: src.slice(i, end) });
      i = end; continue;
    }
    // string
    if (src[i] === '"' || src[i] === "'" || src[i] === "`") {
      const q = src[i]; let j = i + 1;
      while (j < src.length && src[j] !== q) { if (src[j] === "\\") j++; j++; }
      out.push({ t: "str", v: src.slice(i, j + 1) });
      i = j + 1; continue;
    }
    // number / bigint
    if (/\d/.test(src[i])) {
      let j = i;
      while (j < src.length && /[\d_]/.test(src[j])) j++;
      if (src[j] === "n") j++;
      out.push({ t: "num", v: src.slice(i, j) });
      i = j; continue;
    }
    // identifier
    if (/[a-zA-Z_$]/.test(src[i])) {
      let j = i;
      while (j < src.length && /[a-zA-Z0-9_$]/.test(src[j])) j++;
      const word = src.slice(i, j);
      const t: TType = KEYWORDS.has(word) ? "kw" : src[j] === "(" ? "fn" : "plain";
      out.push({ t, v: word });
      i = j; continue;
    }
    // whitespace
    if (/\s/.test(src[i])) {
      let j = i;
      while (j < src.length && /\s/.test(src[j])) j++;
      out.push({ t: "ws", v: src.slice(i, j) });
      i = j; continue;
    }
    out.push({ t: "punc", v: src[i] });
    i++;
  }
  // post-process: .plain → prop
  for (let k = 1; k < out.length; k++) {
    if (out[k - 1].v === "." && out[k].t === "plain") {
      out[k] = { ...out[k], t: "prop" };
    }
  }
  return out;
}

function SyntaxHighlight({ code }: { code: string }) {
  return (
    <>
      {tokenize(code).map((tk, i) =>
        tk.t === "ws"
          ? <span key={i}>{tk.v}</span>
          : <span key={i} style={{ color: COLORS[tk.t] }}>{tk.v}</span>
      )}
    </>
  );
}

// ── Status config ─────────────────────────────────────────────────────────────

const STATUS: Record<SdkCallStatus, { accent: string; label: string }> = {
  idle:    { accent: "rgba(255,255,255,0.18)", label: "ready" },
  loading: { accent: "#00F2FE",               label: "calling…" },
  success: { accent: "#10B981",               label: "success" },
  error:   { accent: "#F87171",               label: "error" },
};

// ── Component ─────────────────────────────────────────────────────────────────

export default function SdkCallPanel({ method, code, status, duration, error }: SdkCallPanelProps) {
  const [open, setOpen] = useState(true);
  const [copied, setCopied] = useState(false);
  const { accent, label } = STATUS[status];

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div style={{
      background: "rgba(0,0,0,0.38)",
      border: `1px solid ${accent}25`,
      borderLeft: `3px solid ${accent}`,
      borderRadius: "10px",
      overflow: "hidden",
      fontSize: "11px",
      fontFamily: "monospace",
      marginTop: "10px",
    }}>
      {/* Header row */}
      <div
        onClick={() => setOpen(o => !o)}
        style={{
          display: "flex", alignItems: "center", gap: 7,
          padding: "6px 10px",
          background: "rgba(0,0,0,0.28)",
          borderBottom: open ? "1px solid rgba(255,255,255,0.05)" : "none",
          cursor: "pointer",
          userSelect: "none",
        }}
      >
        {/* Status dot / spinner */}
        {status === "loading" ? (
          <Loader2 size={10} style={{ color: accent, flexShrink: 0, animation: "spin 1s linear infinite" }} />
        ) : (
          <span style={{ width: 7, height: 7, borderRadius: "50%", background: accent, flexShrink: 0, display: "inline-block" }} />
        )}

        {/* Package badge */}
        <span style={{
          background: "rgba(0,242,254,0.07)", border: "1px solid rgba(0,242,254,0.18)",
          color: "#00F2FE", borderRadius: 4, padding: "1px 5px",
          fontSize: "9px", fontWeight: 700, letterSpacing: "0.02em",
        }}>@taurus-swap/sdk</span>

        {/* Method name */}
        <span style={{ color: "#A3E635", fontWeight: 700, flex: 1 }}>
          {method}()
        </span>

        {/* Status label */}
        <span style={{ color: accent, fontSize: "9px", fontWeight: 700 }}>{label}</span>

        {/* Duration */}
        {duration != null && status !== "loading" && (
          <span style={{ color: "rgba(255,255,255,0.28)", fontSize: "10px" }}>{duration}ms</span>
        )}

        {/* Copy */}
        <button onClick={handleCopy} title="Copy code" style={{
          background: "none", border: "none", cursor: "pointer",
          color: "rgba(255,255,255,0.28)", display: "flex", padding: 2,
        }}>
          {copied ? <Check size={11} color="#10B981" /> : <Copy size={11} />}
        </button>

        {/* Chevron */}
        <span style={{ color: "rgba(255,255,255,0.22)", fontSize: "9px" }}>{open ? "▴" : "▾"}</span>
      </div>

      {/* Code body */}
      {open && (
        <div style={{ padding: "10px 14px", overflowX: "auto" }}>
          <pre style={{ margin: 0, lineHeight: 1.65, fontSize: "11.5px", whiteSpace: "pre" }}>
            <SyntaxHighlight code={code} />
          </pre>
        </div>
      )}

      {/* Error footer */}
      {open && status === "error" && error && (
        <div style={{
          padding: "5px 12px",
          borderTop: "1px solid rgba(248,113,113,0.15)",
          background: "rgba(248,113,113,0.05)",
          color: "#F87171", fontSize: "10px",
        }}>
          ✗ {error}
        </div>
      )}
    </div>
  );
}
