"use client";
import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet, createWallet } from "thirdweb/wallets";
import { NFTGallery } from "./NFTGallery";
import { Marketplace } from "./Marketplace";
import { useState, useEffect } from "react";

const client = createThirdwebClient({ clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID! });
const wallets = [
  inAppWallet({ auth: { options: ["email", "google"] } }),
  createWallet("io.metamask"),
  createWallet("com.coinbase.wallet"),
  createWallet("me.rainbow"),
];
const connectModalConfig = {
  size: "compact" as const,
  title: "Crie uma nova conta",
  welcomeScreen: { title: "Bem-vindo à RastaWallet", subtitle: "Compre Cryptorastas de forma simples" },
};

export const font = '"Helvetica Neue", Helvetica, Arial, sans-serif';
export const Y   = "#FFD800";
export const INK = "#1a1500";

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
    <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "1.25rem 2.5rem", zIndex: 10 }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.625rem" }}>
        <img src="/cryptorastas01-sticker.png" alt="Rasta Logo" style={{ height: "2rem", width: "auto" }} />
        <span style={{ fontFamily: font, fontWeight: 700, fontSize: "1.375rem", color: INK, letterSpacing: "-0.02em" }}>RastaWallet</span>
      </div>
      {showConnect && <ConnectButton client={client} wallets={wallets} connectModal={connectModalConfig} />}
    </nav>
  );
}

function Hero() {
  return (
    <div style={{ minHeight: "100vh", background: Y, display: "flex", flexDirection: "column" }}>
      <Navbar />
      <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "2rem" }}>
        <p style={{ fontFamily: font, fontSize: "0.6875rem", letterSpacing: "0.2em", color: INK, opacity: 0.45, marginBottom: "1.5rem" }}>
          PREMIUM CRYPTO CUSTODY
        </p>
        <h1 style={{ fontFamily: font, fontWeight: 300, fontSize: "clamp(1.5rem, 4.5vw, 3.75rem)", lineHeight: 1.05, color: INK, margin: "0 0 3rem 0", maxWidth: "900px" }}>
          one love<br />inna decentralized<br />style!
        </h1>
        <ConnectButton
          client={client} wallets={wallets} connectModal={connectModalConfig}
          connectButton={{ label: "Conecte-se", style: { background: "transparent", border: "1.5px solid " + INK, borderRadius: "12px", color: INK, fontFamily: font, fontSize: "0.9375rem", fontWeight: 400, padding: "0.875rem 3rem", cursor: "pointer", opacity: 0.75 } }}
        />
      </div>
    </div>
  );
}

function App({ address, isMobile }: { address: string; isMobile: boolean }) {
  const itemsPerPage = isMobile ? 10 : 20;
  return (
    <div style={{ minHeight: "100vh", background: Y, fontFamily: font }}>
      <Navbar showConnect />
      <main style={{ maxWidth: "1100px", margin: "0 auto", padding: "2rem 2rem 6rem" }}>
        <section style={{ marginBottom: "6rem" }}>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontFamily: font, fontWeight: 700, fontSize: "clamp(2rem, 4vw, 3rem)", color: INK, margin: "0 0 0.5rem" }}>Meus Cryptorastas</h2>
            <p style={{ fontFamily: font, fontSize: "0.6875rem", letterSpacing: "0.18em", color: INK, opacity: 0.45 }}>MINHA COLEÇÃO</p>
          </div>
          <NFTGallery walletAddress={address} itemsPerPage={itemsPerPage} />
        </section>
        <section>
          <div style={{ textAlign: "center", marginBottom: "3rem" }}>
            <h2 style={{ fontFamily: font, fontWeight: 700, fontSize: "clamp(2rem, 4vw, 3rem)", color: INK, margin: "0 0 0.5rem" }}>Cryptorastas disponíveis</h2>
          </div>
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
