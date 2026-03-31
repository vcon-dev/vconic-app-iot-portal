import React from "react";
import logoImg from "@assets/vconic-logo_1774985292570.jpeg";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <img src={logoImg} alt="vConic Logo" className="h-8 w-8 object-contain rounded-sm" />
      <span className="font-bold text-xl tracking-tight text-white">vConic</span>
    </div>
  );
}
