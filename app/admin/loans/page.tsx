"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import LoanCard from "@/components/shared/LoanCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { getPendingLoans } from "@/controllers/LoanController";
import { Loan } from "@/models/Loan";

export default function LoanRequestsPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getPendingLoans().then(setLoans).catch(console.error).finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <PageHeader title="Loan Requests" subtitle={`${loans.length} pending`} />
      <div className="px-4 md:px-6 space-y-3">
        {loading ? <LoadingSpinner /> : loans.length === 0 ? (
          <EmptyState icon="📋" title="No Pending Requests" subtitle="Loan requests will appear here" />
        ) : loans.map(loan => (
          <LoanCard key={loan.loanId} loan={loan}
            onClick={() => router.push(`/admin/loans/${(loan as any).id || loan.loanId}`)} />
        ))}
      </div>
    </div>
  );
}
