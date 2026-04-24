"use client";
import Link from "next/link";
import dynamic from "next/dynamic";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-12">
      <header className="absolute top-6 right-6">
        <WalletMultiButton className="!bg-white/10 hover:!bg-white/20 transition-all !rounded-xl" />
      </header>

      <div className="max-w-3xl space-y-6">
        <h1 className="text-6xl md:text-7xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-indigo-400 via-purple-400 to-pink-400">
          Pripay
        </h1>
        <p className="text-xl md:text-2xl text-white/70 font-medium">
          The Private DAO Payroll built on Solana.
        </p>
        <p className="text-white/50 max-w-xl mx-auto text-lg leading-relaxed">
          Fund an organization-wide vault publicly, distribute individual salaries completely <strong className="text-emerald-400 font-bold">privately</strong> using MagicBlock TEE.
        </p>
      </div>

      <div className="flex flex-col sm:flex-row gap-6 mt-8">
        <Link 
          href="/admin"
          className="group relative px-8 py-4 bg-indigo-600/90 hover:bg-indigo-500 rounded-2xl font-bold text-lg overflow-hidden transition-all shadow-[0_0_30px_-5px_rgba(79,70,229,0.5)] hover:shadow-[0_0_40px_-5px_rgba(79,70,229,0.8)]"
        >
          <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out" />
          I'm an Employer
        </Link>
        
        <Link 
          href="/employee"
          className="group relative px-8 py-4 bg-emerald-600/90 hover:bg-emerald-500 rounded-2xl font-bold text-lg overflow-hidden transition-all shadow-[0_0_30px_-5px_rgba(16,185,129,0.5)] hover:shadow-[0_0_40px_-5px_rgba(16,185,129,0.8)]"
        >
          <div className="absolute inset-0 bg-white/20 transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-500 ease-out" />
          I'm an Employee
        </Link>
      </div>
    </div>
  );
}
