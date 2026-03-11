"use client";

import { ConnectButton, useActiveAccount } from "thirdweb/react";
import { createThirdwebClient } from "thirdweb";
import { inAppWallet } from "thirdweb/wallets";
import { NFTGallery } from "./NFTGallery";
import { useState } from "react";
import { Marketplace } from "./Marketplace";

const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

export default function Home() {
  const account = useActiveAccount();
  const [activeTab, setActiveTab] = useState<"owned" | "marketplace">("owned");

  return (
    <div className="min-h-screen bg-rasta-gradient p-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="bg-white p-6 rounded-lg shadow-2xl mb-6 border-t-4 border-rasta-green">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <img
                src="/cryptorastas-logo-wide.png"
                alt="CryptoRastas Logo"
                className="h-12 w-auto"
              />
              <div>
                <h1 className="text-3xl font-bold text-gray-800">
                  Rasta Wallet
                </h1>
                <p className="text-gray-600">
                  Compre CryptoRastas de forma simples
                </p>
              </div>
            </div>
            <ConnectButton
              client={client}
              wallets={[inAppWallet()]}
              connectModal={{
                size: "compact",
              }}
            />
          </div>

          {account && (
            <div className="mt-4 bg-gray-100 p-4 rounded-lg">
              <p className="text-xs text-gray-600 mb-1">Your Wallet:</p>
              <p className="text-sm font-mono text-gray-800">
                {account.address}
              </p>
            </div>
          )}
        </div>

        {/* Tabs */}
        {account && (
          <div className="bg-white p-2 rounded-lg shadow-2xl mb-6">
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab("owned")}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  activeTab === "owned"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                My NFTs
              </button>
              <button
                onClick={() => setActiveTab("marketplace")}
                className={`flex-1 py-3 px-4 rounded-lg font-semibold transition-colors ${
                  activeTab === "marketplace"
                    ? "bg-green-500 text-white"
                    : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                }`}
              >
                Marketplace
              </button>
            </div>
          </div>
        )}

        {/* Content */}
        {account ? (
          <div className="bg-white p-6 rounded-lg shadow-2xl">
            {activeTab === "owned" ? (
              <>
                <h2 className="text-2xl font-bold mb-4">Your CryptoRastas</h2>
                <NFTGallery walletAddress={account.address} />
              </>
            ) : (
              <>
             <h2 className="text-2xl font-bold mb-4">
  CryptoRastas Marketplace
</h2>
<Marketplace />
              </>
            )}
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-2xl text-center">
            <p className="text-gray-600">
              Conecte sua carteira para ver suas CryptoRastas
            </p>
          </div>
        )}
      </div>
    </div>
  );
}