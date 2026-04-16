"use client";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { NFTGallery } from "./NFTGallery";
import { Marketplace } from "./Marketplace";
import { useState, useEffect } from "react";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const wallets = [
  inAppWallet({ auth: { options: ["email", "google"] } }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
];

const connectModalConfig = {
  size: "compact" as const,
  title: "Crie uma nova conta",
  welcomeScreen: {
    title: "Bem-vindo à RastaWallet",
    subtitle: "Compre Cryptorastas de forma simples",
  },
};

const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';

// Redefine CSS vars nos filhos para o tema amarelo
const yellowTheme = {
  "--on-background":      "#1a1500",
  "--on-surface-variant": "rgba(26,21,0,0.55)",
  "--outline-variant":    "rgba(26,21,0,0.2)",
  "--surface-high":       "rgba(255,255,255,0.65)",
  "--surface-mid":        "rgba(255,255,255,0.4)",
  "--surface-bright":     "rgba(255,255,255,0.85)",
  "--gold":               "#7a5c00",
} as React.CSSProperties;

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

function Navbar({ showConnect = false }: { showConnect?: boolean }) {
  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "1.5rem 2.5rem",
      position: "relative",
      zIndex: 10,
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <img src="/cryptorastas01-sticker.png" alt="Rasta Logo" style={{ height: "2rem", width: "auto" }} />
        <span style={{ fontFamily: font, fontWeight: 700, fontSize: "1.375rem", color: "var(--hero-text)", letterSpacing: "-0.02em" }}>
          RastaWallet
        </span>
      </div>
      {showConnect && (
        <ConnectButton client={client} wallets={wallets} connectModal={connectModalConfig} />
      )}
    </nav>
  );
}

function Hero() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--hero-bg)", display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem" }}>
    
        <h1 style={{ fontFamily: font, fontWeight: 300, fontSize: "clamp(1.5rem, 4.5vw, 3.75rem)", lineHeight: 1.05, color: "var(--hero-text)", margin: "0 0 3rem 0", maxWidth: "900px" }}>
          one love<br />inna decentralized<br />style!
        </h1>
        <ConnectButton
          client={client}
          wallets={wallets}
          connectModal={connectModalConfig}
          connectButton={{
            label: "Conecte-se",
            style: {
              background: "transparent",
              border: "1.5px solid var(--hero-text)",
              borderRadius: "12px",
              color: "var(--hero-text)",
              fontFamily: font,
              fontSize: "0.9375rem",
              fontWeight: 400,
              padding: "0.875rem 3rem",
              cursor: "pointer",
              opacity: 0.75,
            },
          }}
        />
      </div>
    </div>
  );
}

function App({ address, isMobile }: { address: string; isMobile: boolean }) {
  const itemsPerPage = isMobile ? 10 : 20;
  return (
    <div style={{ minHeight: "100vh", background: "var(--hero-bg)", ...yellowTheme }}>
      <Navbar showConnect />
      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <section style={{ marginBottom: "4rem" }}>
          <h2 style={{ fontFamily: font, fontSize: "1.5rem", fontWeight: 500, color: "var(--hero-text)", marginBottom: "1.5rem" }}>
            Meus Cryptorastas
          </h2>
          <NFTGallery walletAddress={address} itemsPerPage={itemsPerPage} />
        </section>
        <section>
          <h2 style={{ fontFamily: font, fontSize: "1.5rem", fontWeight: 500, color: "var(--hero-text)", marginBottom: "1.5rem" }}>
            Cryptorastas disponíveis para venda
          </h2>
          <Marketplace itemsPerPage={itemsPerPage} />
        </section>
      </main>
    </div>
  );
}

export default function Home() {
  const account = useActiveAccount();
  const isMobile = useIsMobile();
  if (!account) return <Hero />;
  return <App address={account.address} isMobile={isMobile} />;
}
