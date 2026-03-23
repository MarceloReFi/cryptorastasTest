"use client";

import { ReactNode } from "react";

interface NFTCardProps {
  tokenId: string;
  name: string;
  image: string;
  /** Optional bottom slot: price + purchase buttons */
  children?: ReactNode;
}

export function NFTCard({ tokenId, name, image, children }: NFTCardProps) {
  return (
    <div className="nft-card glass-card overflow-hidden flex flex-col">
      {/* Image */}
      <div className="relative w-full aspect-square overflow-hidden bg-black/30">
        {image ? (
          <img
            src={image}
            alt={name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              (e.target as HTMLImageElement).style.display = "none";
            }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-xs" style={{ color: "var(--cr-text-muted)" }}>
              Sem imagem
            </span>
          </div>
        )}

        {/* Token badge */}
        <span
          className="absolute top-2 left-2 text-xs font-bold px-2 py-0.5 rounded-full"
          style={{
            background: "rgba(0,0,0,0.65)",
            color: "var(--cr-text-secondary)",
            backdropFilter: "blur(4px)",
          }}
        >
          #{tokenId}
        </span>

        {/* Hover overlay with name */}
        <div
          className="nft-card-overlay absolute inset-0 flex items-end"
          style={{ background: "linear-gradient(to top, rgba(0,0,0,0.7) 0%, transparent 60%)" }}
        >
          <p
            className="px-3 pb-3 text-sm font-semibold w-full truncate"
            style={{ color: "var(--cr-text-primary)" }}
          >
            {name}
          </p>
        </div>
      </div>

      {/* Bottom slot */}
      {children && (
        <div className="p-3 flex flex-col gap-2">
          {children}
        </div>
      )}
    </div>
  );
}
