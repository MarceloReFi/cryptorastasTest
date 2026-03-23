"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet } from "thirdweb/wallets";
import { useState, useEffect } from "react";
import { NFTGallery } from "./NFTGallery";
import { Marketplace } from "./Marketplace";
import { HeroSection } from "./components/HeroSection";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);
  return isMobile;
};

export default function Home() {
  const account = useActiveAccount();
  const isMobile = useIsMobile();

  const connectButton = (
    <ConnectButton
      client={client}
      wallets={[
        inAppWallet({
          auth: { options: ["email", "google", "wallet"] },
        }),
      ]}
      connectModal={{
        size: "compact",
        title: "Crie uma nova conta",
        welcomeScreen: {
          title: "Bem-vindo à Rasta Wallet",
          subtitle: "Compre CryptoRastas de forma simples",
        },
      }}
      connectButton={{ label: "Crie sua conta" }}
    />
  );

  return (
    <div className="min-h-screen">
      {/* Hero / Header */}
      <HeroSection connectButton={connectButton} />

      {/* Main content */}
      <main className="max-w-6xl mx-auto px-4 pb-16 space-y-8">
        {account ? (
          <>
            {/* My Collection */}
            <section className="section-dark p-6">
              <h2 className="section-title mb-5">Meus Cryptorastas</h2>
              <NFTGallery
                walletAddress={account.address}
                itemsPerPage={isMobile ? 10 : 20}
              />
            </section>

            {/* Marketplace */}
            <section className="section-dark p-6">
              <h2 className="section-title mb-5">Disponíveis à Venda</h2>
              <Marketplace itemsPerPage={isMobile ? 10 : 20} />
            </section>
          </>
        ) : (
          /* Not connected — teaser */
          <div className="flex flex-col items-center justify-center py-20 text-center gap-4">
            <p className="text-lg font-medium" style={{ color: "var(--cr-text-secondary)" }}>
              Conecte sua carteira para ver sua coleção e comprar Cryptorastas.
            </p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer
        className="border-t py-8 text-center text-sm"
        style={{
          borderColor: "var(--cr-border)",
          color: "var(--cr-text-muted)",
        }}
      >
        <p>© {new Date().getFullYear()} CryptoRastas · One love, inna decentralized style!</p>
      </footer>
    </div>
  );
}
