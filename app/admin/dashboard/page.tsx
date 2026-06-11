"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import StatCard from "@/components/shared/StatCard";
import { getPendingLoans, getActiveLoans, getFundedLoans } from "@/controllers/LoanController";
import { getPendingVerifications } from "@/controllers/EMIController";
import { getPendingWithdrawals } from "@/controllers/WithdrawalController";

export default function AdminDashboard() {
  const router = useRouter();
  const [stats, setStats] = useState({ pending: 0, active: 0, payments: 0, withdrawals: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getPendingLoans().catch(() => []),
      getFundedLoans().catch(() => []),
      getActiveLoans().catch(() => []),
      getPendingVerifications().catch(() => []),
      getPendingWithdrawals().catch(() => []),
    ]).then(([pending, funded, active, payments, withdrawals]) => {
      setStats({ pending: pending.length + funded.length, active: active.length, payments: payments.length, withdrawals: withdrawals.length });
    }).finally(() => setLoading(false));
  }, []);

  const statCards = [
    { label: "Loan Requests", value: stats.pending, icon: "📋", bg: "bg-amber-50", color: "text-amber-600", href: "/admin/loans" },
    { label: "Active Loans", value: stats.active, icon: "✅", bg: "bg-blue-50", color: "text-blue-600", href: "/admin/active-loans" },
    { label: "Verify Payments", value: stats.payments, icon: "🔍", bg: "bg-purple-50", color: "text-purple-600", href: "/admin/payments" },
    { label: "Withdrawals", value: stats.withdrawals, icon: "💸", bg: "bg-rose-50", color: "text-rose-600", href: "/admin/withdrawals" },
  ];

  return (
    <div>
      <PageHeader title="Admin Dashboard" subtitle="Overview of all loan activity" />
      <div className="px-4 md:px-6 grid grid-cols-2 gap-3 mb-6">
        {loading
          ? Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white rounded-2xl p-4 shadow-sm animate-pulse">
                <div className="w-10 h-10 bg-gray-100 rounded-xl mb-3" />
                <div className="h-7 w-12 bg-gray-100 rounded mb-2" />
                <div className="h-3 w-24 bg-gray-100 rounded" />
              </div>
            ))
          : statCards.map(c => (
              <StatCard key={c.label} label={c.label} value={c.value} icon={c.icon}
                bg={c.bg} color={c.color} onClick={() => router.push(c.href)} />
            ))
        }
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
