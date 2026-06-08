"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import LoanCard from "@/components/shared/LoanCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { getAllLoans } from "@/controllers/LoanController";
import { Loan, } from "@/models/Loan";
import { LoanStatus } from "@/constants/Enums";
import { Plus } from "lucide-react";

const FILTERS = ["All", "Pending", "Active", "Closed"] as const;
type Filter = typeof FILTERS[number];

export default function MemberLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [filter, setFilter] = useState<Filter>("All");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllLoans().then(setLoans).catch(console.error).finally(() => setLoading(false));
  }, []);

  const filtered = loans.filter(l => {
    if (filter === "All") return true;
    if (filter === "Pending") return l.status === LoanStatus.PENDING;
    if (filter === "Active") return l.status === LoanStatus.ACTIVE;
    if (filter === "Closed") return (l.status as string) === "CLOSED";
    return true;
  });

  return (
    <div>
      <PageHeader title="All Loans" subtitle={`${loans.length} total`}
        action={
          <button onClick={() => router.push("/member/loans/new")}
            className="flex items-center gap-1.5 bg-[#4B4BF7] text-white px-3 py-2 rounded-xl text-sm font-semibold">
            <Plus size={16} /> New
          </button>
        } />

      {/* Filters */}
      <div className="px-4 flex gap-2 mb-4 overflow-x-auto pb-1">
        {FILTERS.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-semibold whitespace-nowrap transition-colors ${filter === f ? "bg-[#4B4BF7] text-white" : "bg-white text-gray-600 border border-gray-200"}`}>
            {f}
          </button>
        ))}
      </div>

      <div className="px-4 space-y-3">
        {loading ? <LoadingSpinner /> : filtered.length === 0 ? (
          <EmptyState icon="📋" title="No Loans Found" subtitle="Loan requests will appear here" />
        ) : filtered.map(loan => (
          <LoanCard key={loan.loanId} loan={loan}
            onClick={() => router.push(`/member/loans/${(loan as any).id || loan.loanId}`)} />
        ))}
      </div>
    </div>
  );
}
