"use client";

/* ─── PIX Button ────────────────────────────────────────────── */
export function PixBuyButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full py-2.5 px-4 font-bold text-sm text-black rounded-[12px]
                 transition-all duration-300
                 hover:scale-[1.02] active:scale-[0.98]"
      style={{
        background: "var(--cr-yellow)",
        boxShadow: "0 4px 14px var(--cr-yellow-glow)",
        border: "1px solid rgba(253, 185, 19, 0.5)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--cr-yellow-dark)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "0 6px 20px var(--cr-yellow-glow)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.background = "var(--cr-yellow)";
        (e.currentTarget as HTMLButtonElement).style.boxShadow =
          "0 4px 14px var(--cr-yellow-glow)";
      }}
    >
      Comprar com PIX
    </button>
  );
}

/* ─── ETH Button styles (passed to TransactionButton) ───────── */
export const ethButtonStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.625rem 1rem",
  borderRadius: "12px",
  fontWeight: "bold",
  fontSize: "0.875rem",
  transition: "all 0.3s ease",
  backgroundColor: "var(--cr-green)",
  color: "#ffffff",
  border: "1px solid rgba(0, 166, 81, 0.45)",
  boxShadow: "0 4px 14px rgba(0, 166, 81, 0.28)",
  cursor: "pointer",
};

export const ethButtonProcessingStyle: React.CSSProperties = {
  ...ethButtonStyle,
  backgroundColor: "#374151",
  color: "#9ca3af",
  border: "1px solid rgba(255,255,255,0.08)",
  boxShadow: "none",
  cursor: "not-allowed",
};

/* ─── Disabled "connect to buy" placeholder ─────────────────── */
export function ConnectPromptButton() {
  return (
    <button
      disabled
      className="w-full py-2.5 px-4 rounded-[12px] text-sm font-semibold cursor-not-allowed"
      style={{
        background: "rgba(255,255,255,0.05)",
        color: "var(--cr-text-muted)",
        border: "1px solid var(--cr-border)",
      }}
    >
      Conecte para Comprar
    </button>
  );
}
