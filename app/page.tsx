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

// ─── Nav ──────────────────────────────────────────────────────────────────────
function Navbar({ heroMode = false }: { heroMode?: boolean }) {
  const color = heroMode ? "var(--hero-text)" : "var(--on-background)";
  return (
    <nav style={{
      display: "flex",
      justifyContent: "space-between",
      alignItems: "center",
      padding: "1.5rem 2.5rem",
      position: "relative",
      zIndex: 10,
    }}>
      <span style={{
        fontFamily: "'Manrope', sans-serif",
        fontWeight: 700,
        fontSize: "1.375rem",
        color,
        letterSpacing: "-0.02em",
      }}>
        RastaWallet
      </span>
      <span style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: "0.6875rem",
        letterSpacing: "0.18em",
        color,
        opacity: 0.6,
      }}>
        SUPPORT
      </span>
    </nav>
  );
}

// ─── Hero ─────────────────────────────────────────────────────────────────────
function Hero() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--hero-bg)", display: "flex", flexDirection: "column" }}>
      <Navbar heroMode />
      <div style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
      }}>
        <p style={{
          fontFamily: "'Inter', sans-serif",
          fontSize: "0.6875rem",
          letterSpacing: "0.2em",
          color: "var(--hero-text)",
          opacity: 0.45,
          marginBottom: "1.5rem",
        }}>
       
        </p>

        <h1 style={{
          fontFamily: "'Manrope', sans-serif",
          fontWeight: 300,
          fontSize: "clamp(3rem, 9vw, 7.5rem)",
          lineHeight: 1.05,
          color: "var(--hero-text)",
          margin: "0 0 3rem 0",
          maxWidth: "900px",
        }}>
          one love<br />
          inna decentralized<br />
          style!
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
              fontFamily: "'Inter', sans-serif",
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

// ─── App (autenticado) ────────────────────────────────────────────────────────
function App({ address, isMobile }: { address: string; isMobile: boolean }) {
  const itemsPerPage = isMobile ? 10 : 20;

  return (
    <div style={{ minHeight: "100vh", background: "var(--surface)" }}>
      <Navbar />

      <div style={{ display: "flex", justifyContent: "flex-end", padding: "0 2.5rem 1rem" }}>
        <ConnectButton client={client} wallets={wallets} connectModal={connectModalConfig} />
      </div>

      <main style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 2rem 4rem" }}>
        <section style={{ marginBottom: "4rem" }}>
          <h2 style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: "1.5rem",
            fontWeight: 500,
            color: "var(--on-background)",
            marginBottom: "1.5rem",
          }}>
            Meus Cryptorastas
          </h2>
          <div style={{ background: "var(--surface-low)", borderRadius: "16px", padding: "1.5rem" }}>
            <NFTGallery walletAddress={address} itemsPerPage={itemsPerPage} />
          </div>
        </section>

        <section>
          <h2 style={{
            fontFamily: "'Manrope', sans-serif",
            fontSize: "1.5rem",
            fontWeight: 500,
            color: "var(--on-background)",
            marginBottom: "1.5rem",
          }}>
            Cryptorastas disponíveis
          </h2>
          <Marketplace itemsPerPage={itemsPerPage} />
        </section>
      </main>
    </div>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────
export default function Home() {
  const account = useActiveAccount();
  const isMobile = useIsMobile();

  if (!account) return <Hero />;
  return <App address={account.address} isMobile={isMobile} />;
}
