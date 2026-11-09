"use client";

import React from "react";

interface BrandLogoProps {
  size?: "sm" | "md" | "lg";
  showText?: boolean;
}

export function BrandLogo({ size = "md", showText = true }: BrandLogoProps) {
  const iconSizes = {
    sm: "w-7 h-7 text-xs",
    md: "w-9 h-9 text-sm",
    lg: "w-12 h-12 text-base",
  };

  const ringSizes = {
    sm: "w-5 h-5 border-[1.5px]",
    md: "w-7 h-7 border-[2px]",
    lg: "w-9 h-9 border-[2.5px]",
  };

  return (
    <div className="flex items-center gap-2.5">
      {/* DB Teal Symbol */}
      <div
        className={`${iconSizes[size]} rounded-xl bg-[#2cb8b2] flex items-center justify-center shrink-0 shadow-sm transition-transform hover:scale-105`}
      >
        <div
          className={`${ringSizes[size]} rounded-full border-white flex items-center justify-center font-bold text-white tracking-tighter`}
        >
          DB
        </div>
      </div>

      {showText && (
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-1.5">
            <span className="font-bold text-sm text-[#0f172a] tracking-tight leading-none">
              Digital Back Office
            </span>
          </div>
          <span className="text-[11px] font-medium text-[#2cb8b2] tracking-wide mt-0.5">
            AI Data Analyst
          </span>
        </div>
      )}
    </div>
  );
}

