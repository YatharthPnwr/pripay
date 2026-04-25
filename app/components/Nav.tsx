"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export function Nav() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    const stored = localStorage.getItem("pripay-theme");
    if (stored) setDark(stored === "dark");
  }, []);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
    localStorage.setItem("pripay-theme", dark ? "dark" : "light");
  }, [dark]);

  return (
    <nav className="nav">
      <Link href="/" className="nav-logo">        
        <Image src="/icon.png" alt="PriPay" width={38} height={38} style={{ borderRadius: "45%" }} />
        PriPay
      </Link>
      <div className="nav-right">
        <button className="btn-icon" onClick={() => setDark(!dark)} title="Toggle theme">
          {dark ? <SunIcon /> : <MoonIcon />}
        </button>
        <WalletMultiButton />
      </div>
    </nav>
  );
}

function SunIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="8" cy="8" r="3" />
      <line x1="8" y1="1" x2="8" y2="2.5" />
      <line x1="8" y1="13.5" x2="8" y2="15" />
      <line x1="1" y1="8" x2="2.5" y2="8" />
      <line x1="13.5" y1="8" x2="15" y2="8" />
      <line x1="3.05" y1="3.05" x2="4.1" y2="4.1" />
      <line x1="11.9" y1="11.9" x2="12.95" y2="12.95" />
      <line x1="12.95" y1="3.05" x2="11.9" y2="4.1" />
      <line x1="4.1" y1="11.9" x2="3.05" y2="12.95" />
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M13.5 10A6 6 0 0 1 6 2.5a5.5 5.5 0 1 0 7.5 7.5z" />
    </svg>
  );
}
