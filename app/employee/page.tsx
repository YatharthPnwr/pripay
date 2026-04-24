// app/employee/page.tsx
"use client";
import dynamic from "next/dynamic";
import { ClaimSalary } from "../components/ClaimSalary";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

export default function EmployeeDashboard() {
  return (
    <main className="max-w-2xl mx-auto w-full p-6 space-y-12 flex-1 mt-12">
      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-emerald-400 to-teal-400">
          Employee Portal
        </h1>
        <WalletMultiButton className="!bg-white/10 hover:!bg-white/20 transition-all !rounded-xl" />
      </header>

      <section>
        <ClaimSalary />
      </section>
    </main>
  );
}
