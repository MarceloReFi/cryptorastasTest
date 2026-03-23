import type { Metadata } from "next";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";

export const metadata: Metadata = {
  title: "Rasta Wallet - Compre CryptoRastas",
  description: "Marketplace de CryptoRastas. Compre de forma simples usando PIX ou ETH, sem complicação.",
  icons: {
    icon: '/cryptorastas-pixel1x1.gif',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ThirdwebProvider>
          {children}
        </ThirdwebProvider>
      </body>
    </html>
  );
}