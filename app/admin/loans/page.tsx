"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import LoanCard from "@/components/shared/LoanCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { getPendingLoans, getFundedLoans } from "@/controllers/LoanController";
import { Loan } from "@/models/Loan";

type Tab = "pending" | "funded";

export default function LoanRequestsPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("pending");
  const [pending, setPending] = useState<Loan[]>([]);
  const [funded, setFunded] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try {
      const [p, f] = await Promise.all([getPendingLoans(), getFundedLoans()]);
      setPending(p);
      setFunded(f);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  const loans = tab === "pending" ? pending : funded;

  return (
    <div>
      <PageHeader
        title="Loan Requests"
        subtitle={`${pending.length} pending · ${funded.length} funded`}
        action={
          <button onClick={loadLoans} className="text-sm text-[#4B4BF7] font-semibold hover:underline">
            Refresh
          </button>
        }
      />

      {/* Tabs */}
      <div className="px-4 md:px-6 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(["pending", "funded"] as Tab[]).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-colors ${
                tab === t ? "bg-white text-[#4B4BF7] shadow-sm" : "text-gray-500"
              }`}
            >
              {t === "pending" ? `Pending (${pending.length})` : `Funded (${funded.length})`}
            </button>
          ))}
        </div>
      </div>

      <div className="px-4 md:px-6 space-y-3">
        {loading ? (
          <LoadingSpinner />
        ) : loans.length === 0 ? (
          <EmptyState
            icon={tab === "pending" ? "📋" : "💰"}
            title={tab === "pending" ? "No Pending Requests" : "No Funded Loans"}
            subtitle={
              tab === "pending"
                ? "New loan requests will appear here"
                : "Loans fully funded and awaiting approval appear here"
            }
          />
        ) : (
          loans.map((loan) => (
            <LoanCard
              key={loan.loanId}
              loan={loan}
              onClick={() => router.push(`/admin/loans/${(loan as any).id || loan.loanId}`)}
            />
          ))
        )}
      </div>
    </div>
  );
}
