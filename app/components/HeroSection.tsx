"use client";

import { ReactNode } from "react";

/* ─── Reusable Social Icon ──────────────────────────────────── */
function SocialLink({
  href,
  label,
  children,
}: {
  href: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="flex items-center justify-center w-10 h-10 rounded-full
                 bg-white/8 border border-white/12
                 text-[var(--cr-text-secondary)]
                 hover:text-[var(--cr-yellow)] hover:border-[var(--cr-border-accent)]
                 hover:bg-white/12 hover:shadow-[var(--cr-shadow-glow-yellow)]
                 transition-all duration-300"
    >
      {children}
    </a>
  );
}

/* ─── SVG Icons ─────────────────────────────────────────────── */
function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z" />
    </svg>
  );
}

function TwitterIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z" />
    </svg>
  );
}

/* ─── HeroSection ───────────────────────────────────────────── */
interface HeroSectionProps {
  connectButton: ReactNode;
}

export function HeroSection({ connectButton }: HeroSectionProps) {
  return (
    <header className="relative w-full">
      {/* Subtle top accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-[3px]"
        style={{
          background: "linear-gradient(90deg, var(--cr-red) 0%, var(--cr-yellow) 50%, var(--cr-green) 100%)",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 pt-8 pb-12">
        {/* Nav row */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-10">
          <div className="flex items-center gap-3">
            <img
              src="/cryptorastas01-sticker.jpg"
              alt="CryptoRastas Logo"
              className="h-16 w-16 object-cover"
              style={{
                borderRadius: "var(--cr-radius)",
                border: "2px solid var(--cr-yellow)",
                boxShadow: "0 0 12px var(--cr-yellow-glow)",
              }}
            />
            <span
              className="font-display text-3xl tracking-widest"
              style={{ color: "var(--cr-text-primary)" }}
            >
              RASTAWALLET
            </span>
          </div>
          {connectButton}
        </div>

        {/* Hero copy */}
        <div className="text-center py-6">
          <h1
            className="font-display text-5xl sm:text-7xl md:text-8xl leading-none tracking-wide mb-4"
            style={{ color: "var(--cr-text-primary)" }}
          >
            CRYPTORASTAS
          </h1>
          <p
            className="text-lg sm:text-xl md:text-2xl font-medium max-w-2xl mx-auto leading-relaxed"
            style={{ color: "var(--cr-text-secondary)" }}
          >
            Sua coleção, seu legado,{" "}
            <span style={{ color: "var(--cr-yellow)" }}>na batida do blockchain</span>
          </p>

          {/* Social links */}
          <div className="flex items-center justify-center gap-3 mt-8">
            <SocialLink href="https://discord.gg/cryptorastas" label="Discord">
              <DiscordIcon />
            </SocialLink>
            <SocialLink href="https://twitter.com/cryptorastas" label="Twitter / X">
              <TwitterIcon />
            </SocialLink>
            <SocialLink href="https://instagram.com/cryptorastas" label="Instagram">
              <InstagramIcon />
            </SocialLink>
          </div>
        </div>
      </div>
    </header>
  );
}
