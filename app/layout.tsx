import type { Metadata } from "next";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";

export const metadata: Metadata = {
  title: "RastaWallet",
  description: "One love inna decentralized style. Compre Cryptorastas com PIX ou ETH.",
  icons: { icon: '/cryptorastas-pixel1x1.gif' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>
        <ThirdwebProvider>{children}</ThirdwebProvider>
      </body>
    </html>
  );
}
