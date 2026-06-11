"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import RefreshButton from "@/components/shared/RefreshButton";
import { getPendingVerifications, verifyEMIPayment } from "@/controllers/EMIController";
import { getLoanById } from "@/controllers/LoanController";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import { toast } from "sonner";

export default function PaymentVerificationPage() {
  const router = useRouter();
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [verifying, setVerifying] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getPendingVerifications();
      const enriched = await Promise.all(data.map(async (p: any) => {
        try {
          const loan = await getLoanById(p.loanId);
          return { ...p, loanNumber: loan?.loanNumber || p.loanId, customerName: loan?.customerName || "—", finderMemberName: loan?.finderMemberName || "—" };
        } catch { return p; }
      }));
      setPayments(enriched);
    } catch (e: any) { toast.error(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const handleVerify = async (payment: any) => {
    const docId = payment.id || payment.paymentId;
    if (!confirm(`Confirm received ₹${Number(payment.amtPaid).toFixed(2)} from ${payment.finderMemberName}?\n\nWallets will be distributed immediately.`)) return;
    setVerifying(docId);
    try {
      await verifyEMIPayment(docId, payment.loanId, Number(payment.amtPaid));
      setPayments(prev => prev.filter(p => (p.id || p.paymentId) !== docId));
      toast.success(`EMI #${payment.emiNumber} verified. Wallets updated!`);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setVerifying(null); }
  };

  return (
    <div>
      <PageHeader
        title="Payment Verification"
        subtitle="Verify EMI payments from members"
        action={<RefreshButton onRefresh={loadData} />}
      />
      <div className="px-4 md:px-6 space-y-3">
        {loading ? <LoadingSpinner /> : payments.length === 0 ? (
          <EmptyState icon="✅" title="No Pending Verifications" subtitle="All EMI payments have been verified" />
        ) : payments.map((p: any) => {
          const docId = p.id || p.paymentId;
          return (
            <div key={docId} className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-amber-400">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="text-xs font-bold text-[#4B4BF7]">{p.loanNumber}</p>
                  <p className="font-bold text-gray-900">{p.customerName}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Finder: {p.finderMemberName}</p>
                </div>
                <span className="text-xs bg-amber-100 text-amber-700 font-bold px-2 py-1 rounded-full">Pending</span>
              </div>
              <div className="flex justify-between items-center mb-3">
                <span className="text-sm text-gray-600">EMI #{p.emiNumber}</span>
                <span className="text-2xl font-black text-[#4B4BF7]">{formatCurrency(p.amtPaid)}</span>
              </div>
              <div className="grid grid-cols-2 gap-2 bg-gray-50 rounded-xl p-3 mb-3">
                <div><p className="text-xs text-gray-400">Principal</p><p className="font-bold text-gray-900">{formatCurrency(Number(p.principalPortion)||0)}</p></div>
                <div><p className="text-xs text-gray-400">Interest</p><p className="font-bold text-gray-900">{formatCurrency(Number(p.interestPortion)||0)}</p></div>
              </div>
              <div className="bg-[#EEF2FF] rounded-xl p-2 mb-3">
                <p className="text-xs text-[#4B4BF7]">On verify: Principal → all contributors · Interest → 10% finder + 90% by ratio</p>
              </div>
              <p className="text-xs text-gray-400 mb-3">Recorded: {formatDate(p.createdAt)}</p>
              <button onClick={() => handleVerify(p)} disabled={verifying === docId}
                className="w-full py-3 bg-[#4B4BF7] text-white font-bold rounded-xl hover:bg-[#3b3be0] disabled:opacity-60">
                {verifying === docId ? "Verifying..." : "Confirm Received & Distribute"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
