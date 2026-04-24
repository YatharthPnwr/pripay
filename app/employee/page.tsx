"use client";
import Link from "next/link";
import { ClaimSalary } from "../components/ClaimSalary";

export default function EmployeeDashboard() {
  return (
    <div className="employee-wrap page-anim">
      <div className="employee-inner">
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 28,
          }}
        >
          <Link href="/" className="page-back" style={{ margin: 0 }}>
            <ArrowLeftIcon />
            Employee Portal
          </Link>
          <span className="badge">
            <ShieldIcon />
            Private
          </span>
        </div>

        <ClaimSalary />
      </div>
    </div>
  );
}

function ArrowLeftIcon() {
  return (
    <svg width={12} height={12} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <polyline points="10,3 4,8 10,13" />
    </svg>
  );
}

function ShieldIcon() {
  return (
    <svg width={10} height={10} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M8 1.5L2 4v4c0 3.3 2.5 6 6 7 3.5-1 6-3.7 6-7V4z" />
    </svg>
  );
}
