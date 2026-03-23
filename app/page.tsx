"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet } from "thirdweb/wallets";
import { NFTGallery } from "./NFTGallery";
import { useState, useEffect } from "react";
import { Marketplace } from "./Marketplace";

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

  return (
    <div className="min-h-screen bg-rasta-gradient p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow-2xl mb-6 border-t-4 border-rasta-green">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4">
              <img
                src="/Cryptorastas-logo-wide.png"
                alt="CryptoRastas Logo"
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  RastaWallet
                </h1>
                <p className="text-gray-600">
                  One love, inna decentralized style!
                </p>
              </div>
            </div>
            <ConnectButton
              client={client}
              wallets={[
                inAppWallet({
                  auth: {
                    options: ["email", "google", "wallet"],
                  },
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
              connectButton={{
                label: "Crie sua conta",
              }}
            />
          </div>


        </div>

        {/* Conteúdo unificado */}
        {account ? (
          <div className="space-y-6">
            {/* Minhas CryptoRastas */}
            <div className="bg-white p-6 rounded-lg shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-900"> Meus Cryptorastas</h2>
              <NFTGallery
                walletAddress={account.address}
                itemsPerPage={isMobile ? 10 : 20}
              />
            </div>
            {/* Marketplace */}
            <div className="bg-transparent p-6 rounded-lg shadow-2xl">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">
                Cryptorastas disponíveis à venda
              </h2>
              <Marketplace itemsPerPage={isMobile ? 10 : 20} />
            </div>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-2xl text-center">
            <p className="text-gray-600">
              Entre com seu email ou conta Google.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
