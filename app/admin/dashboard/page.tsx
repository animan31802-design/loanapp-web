"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getPendingLoans, getActiveLoans } from "@/controllers/LoanController";
import { getPendingVerifications } from "@/controllers/EMIController";
import { getPendingWithdrawals } from "@/controllers/WithdrawalController";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ pending: 0, active: 0, payments: 0, withdrawals: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPendingLoans().catch(() => []),
      getActiveLoans().catch(() => []),
      getPendingVerifications().catch(() => []),
      getPendingWithdrawals().catch(() => []),
    ]).then(([pending, active, payments, withdrawals]) => {
      setStats({ pending: pending.length, active: active.length, payments: payments.length, withdrawals: withdrawals.length });
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <><PageHeader title="Dashboard" /><LoadingSpinner /></>;

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Overview of all loan activity" />
      <div className="px-4 md:px-6 grid grid-cols-2 gap-3 mb-6">
        <StatCard label="Loan Requests" value={stats.pending} icon="📋" bg="bg-amber-50" color="text-amber-600" onClick={() => router.push("/admin/loans")} />
        <StatCard label="Active Loans" value={stats.active} icon="✅" bg="bg-blue-50" color="text-blue-600" onClick={() => router.push("/admin/active-loans")} />
        <StatCard label="Verify Payments" value={stats.payments} icon="🔍" bg="bg-purple-50" color="text-purple-600" onClick={() => router.push("/admin/payments")} />
        <StatCard label="Withdrawals" value={stats.withdrawals} icon="💸" bg="bg-rose-50" color="text-rose-600" onClick={() => router.push("/admin/withdrawals")} />
      </div>
      <div className="px-4 md:px-6">
        <h2 className="text-base font-bold text-gray-700 mb-3">Management</h2>
        <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
          {[
            { label: "Members", href: "/admin/members", icon: "👥" },
            { label: "Loan Plans", href: "/admin/plans", icon: "📋" },
            { label: "Reports", href: "/admin/reports", icon: "📊" },
            { label: "Settings", href: "/admin/settings", icon: "⚙️" },
          ].map(item => (
            <a key={item.href} href={item.href}
              className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors">
              <span className="text-2xl">{item.icon}</span>
              <span className="font-medium text-gray-800">{item.label}</span>
              <span className="ml-auto text-gray-300">›</span>
            </a>
          ))}
        </div>
      </div>
    </div>
  );
}
