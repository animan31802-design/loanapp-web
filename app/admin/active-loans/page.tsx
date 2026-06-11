"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import LoanCard from "@/components/shared/LoanCard";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import RefreshButton from "@/components/shared/RefreshButton";
import { getActiveLoans } from "@/controllers/LoanController";
import { Loan } from "@/models/Loan";

export default function ActiveLoansPage() {
  const router = useRouter();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [loading, setLoading] = useState(true);

  const loadLoans = useCallback(async () => {
    setLoading(true);
    try { const l = await getActiveLoans(); setLoans(l); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadLoans(); }, [loadLoans]);

  return (
    <div>
      <PageHeader
        title="Active Loans"
        subtitle={`${loans.length} active`}
        action={<RefreshButton onRefresh={loadLoans} />}
      />
      <div className="px-4 md:px-6 space-y-3">
        {loading ? <LoadingSpinner /> : loans.length === 0 ? (
          <EmptyState icon="✅" title="No Active Loans" subtitle="Approved loans appear here" />
        ) : loans.map(loan => (
          <LoanCard key={loan.loanId} loan={loan}
            onClick={() => router.push(`/admin/active-loans/${(loan as any).id || loan.loanId}`)} />
        ))}
      </div>
    </div>
  );
}
