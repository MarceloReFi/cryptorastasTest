import type { Metadata } from "next";
import "./globals.css";
import { ThirdwebProvider } from "thirdweb/react";

const BASE_URL = "https://app.cryptorastas.com";

export const metadata: Metadata = {
  title: "RastaWallet",
  description: "One love inna decentralized style. Compre Cryptorastas com Pix ou Cartão.",
  icons: { icon: '/cryptorastas-pixel1x1.gif' },
  openGraph: {
    images: [{ url: `${BASE_URL}/og-image.png`, width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    images: [`${BASE_URL}/og-image.png`],
  },
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
