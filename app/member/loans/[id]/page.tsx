"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getLoanById } from "@/controllers/LoanController";
import { getSharesByLoan } from "@/controllers/ShareController";
import { getEMIPaymentsByLoan, getNextEMINumber, recordEMIPayment } from "@/controllers/EMIController";
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import { LoanStatus, LoanMode, UserRole } from "@/constants/Enums";
import { toast } from "sonner";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtMonth = (v: string) => { if(!v) return "—"; const [y,m]=v.split("-"); return `${MONTHS[parseInt(m)-1]} ${y}`; };
const fmtDisb = (v: string) => { if(!v) return "—"; const [y,m]=v.split("-"); return `1 ${MONTHS[parseInt(m)-1]} ${y}`; };
const modeLabel = (m: string|null) => m===LoanMode.FLAT_EMI?"Flat EMI":m===LoanMode.INTEREST_ONLY?"Interest Only":"Reducing EMI";

export default function LoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { userProfile } = useAuth();
  const [loan, setLoan] = useState<any>(null);
  const [shares, setShares] = useState<any[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [nextEMI, setNextEMI] = useState(1);
  const [loading, setLoading] = useState(true);
  const [recording, setRecording] = useState(false);

  const loadAll = useCallback(async () => {
    try {
      const [l, s, p, n] = await Promise.all([getLoanById(id), getSharesByLoan(id), getEMIPaymentsByLoan(id), getNextEMINumber(id)]);
      setLoan(l); setShares(s); setPayments(p); setNextEMI(n);
    } catch (e: any) { toast.error(e.message || "Failed to load"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleRecordEMI = async () => {
    if (!loan || !userProfile) return;
    if (!confirm(`Record EMI #${nextEMI}?\n\nThis will be saved as pending verification. Admin must confirm before wallets are updated.`)) return;
    setRecording(true);
    try {
      const { getEMISplit } = await import("@/controllers/EMIController");
      const split = getEMISplit(loan, nextEMI);
      await recordEMIPayment({ loanId: id, emiNumber: nextEMI, amtPaid: split.totalEMI, recordedBy: userProfile.uid, recordedByName: userProfile.name });
      toast.success(`EMI #${nextEMI} recorded! Awaiting admin verification.`);
      loadAll();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setRecording(false); }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!loan) return <div className="p-6 text-center text-gray-500">Loan not found</div>;

  const isActive = loan.status === LoanStatus.ACTIVE;
  const isDisbursed = loan.disbursed === true;
  const disbDate = loan.disbursementDate;
  const months = Number(loan.tenureMonths) || 0;
  const paidCount = payments.filter((p: any) => p.verified).length;
  const isFinderOrAdmin = userProfile?.uid === loan.finderMemberId || userProfile?.role === UserRole.ADMIN;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 p-4 sticky top-14 bg-white z-10 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft size={20} /></button>
        <h1 className="text-lg font-bold text-gray-900">Loan Detail</h1>
      </div>

      <div className="p-4 space-y-4 pb-10">
        {/* Customer */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {loan.loanNumber && <p className="text-xs font-bold text-[#4B4BF7] mb-1">{loan.loanNumber}</p>}
          <div className="flex justify-between items-start">
            <p className="text-xl font-bold text-gray-900">{loan.customerName}</p>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${loan.status==="ACTIVE"?"bg-blue-100 text-blue-700":loan.status==="PENDING"?"bg-amber-100 text-amber-700":"bg-green-100 text-green-700"}`}>{loan.status}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">👨‍💼 Finder: {loan.finderMemberName}</p>
          <p className="text-sm text-gray-500 mt-0.5">🗓️ Request: {fmtMonth(loan.requestMonth)}</p>
        </div>

        {/* Amount */}
        <div className="bg-[#EEF2FF] rounded-2xl p-5 text-center">
          <p className="text-sm text-[#4B4BF7] font-semibold">Loan Amount</p>
          <p className="text-4xl font-black text-[#4B4BF7] mt-1">{formatCurrency(loan.requestedAmt)}</p>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Plan Details</p>
          <div className="grid grid-cols-2 gap-3">
            {[["Plan",loan.planName||"—"],["Duration",`${loan.tenureMonths||"—"} months`],["Interest",`₹${loan.interestRatePerHundred||"—"}/₹100/mo`],["Mode",modeLabel(loan.mode)]].map(([l,v])=>(
              <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-bold text-gray-900 mt-0.5 text-sm">{v}</p></div>
            ))}
          </div>
        </div>

        {/* Disbursement */}
        {isActive && disbDate && (
          <div className={`rounded-2xl p-4 shadow-sm ${isDisbursed?"bg-green-50":"bg-amber-50"}`}>
            <p className={`text-xs font-bold uppercase tracking-wide ${isDisbursed?"text-green-600":"text-amber-600"}`}>
              {isDisbursed ? "✅ Disbursed" : "⏳ Awaiting Disbursement"}
            </p>
            <p className="text-lg font-bold text-gray-900 mt-1">{fmtDisb(disbDate)}</p>
            {!isDisbursed && <p className="text-xs text-amber-700 mt-1">Admin will GPay amount to finder member on this date.</p>}
          </div>
        )}

        {/* EMI Progress */}
        {isActive && months > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">EMI Progress</p>
            <div className="h-2 bg-gray-100 rounded-full mb-2">
              <div className="h-2 bg-[#4B4BF7] rounded-full transition-all" style={{width:`${Math.round(paidCount/months*100)}%`}} />
            </div>
            <p className="text-xs text-gray-500 mb-3">{paidCount} of {months} verified · {months-paidCount} remaining</p>
            {[...payments].reverse().map((p: any) => (
              <div key={p.paymentId||p.id} className="flex justify-between items-center py-2 border-t border-gray-50">
                <span className="text-sm text-gray-600">EMI #{p.emiNumber}</span>
                <span className="font-bold text-gray-900">{formatCurrency(p.amtPaid)}</span>
                <span className={`text-xs font-semibold ${p.verified?"text-green-600":"text-amber-600"}`}>{p.verified?"✅ Verified":"⏳ Pending"}</span>
              </div>
            ))}
            {isFinderOrAdmin && isDisbursed && paidCount < months && (
              <button onClick={handleRecordEMI} disabled={recording}
                className="w-full mt-3 py-3 bg-[#4B4BF7] text-white font-bold rounded-xl hover:bg-[#3b3be0] disabled:opacity-60">
                {recording ? "Recording..." : `Record EMI #${nextEMI}`}
              </button>
            )}
          </div>
        )}

        {/* Member contributions */}
        {shares.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Member Contributions</p>
            {shares.map((sh: any) => (
              <div key={sh.shareId||sh.id} className="flex justify-between items-center py-2 border-t border-gray-50">
                <p className="text-sm font-semibold text-gray-900">{sh.memberName}</p>
                <div className="text-right">
                  <p className="font-bold text-[#4B4BF7]">{formatCurrency(sh.shareAmt)}</p>
                  <p className="text-xs text-gray-400">{((Number(sh.shareRatio)||0)*100).toFixed(1)}%</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
