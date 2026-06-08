"use client";
import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getLoanById, markDisbursed, cancelLoan } from "@/controllers/LoanController";
import { getSharesByLoan, markInvestmentCollected, areAllContributionsCollected } from "@/controllers/ShareController";
import { getEMIPaymentsByLoan } from "@/controllers/EMIController";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import { LoanStatus, LoanMode } from "@/constants/Enums";
import { Loan } from "@/models/Loan";
import { Share } from "@/models/Share";
import { toast } from "sonner";

const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtDisb = (v: string) => { if (!v) return "—"; const [y,m] = v.split("-"); return `1 ${MONTHS[parseInt(m)-1]} ${y}`; };
const modeLabel = (m: string|null) => m === LoanMode.FLAT_EMI?"Flat EMI":m===LoanMode.INTEREST_ONLY?"Interest Only":"Reducing EMI";

export default function ActiveLoanDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loan, setLoan] = useState<Loan|null>(null);
  const [shares, setShares] = useState<Share[]>([]);
  const [payments, setPayments] = useState<any[]>([]);
  const [allCollected, setAllCollected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [collectingId, setCollectingId] = useState<string|null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [l, s, p] = await Promise.all([getLoanById(id), getSharesByLoan(id), getEMIPaymentsByLoan(id)]);
      setLoan(l as Loan); setShares(s as Share[]); setPayments(p);
      const collected = s.length > 0 && s.every((sh: any) => sh.investmentCollected === true);
      setAllCollected(collected);
    } catch (e: any) { toast.error(e.message||"Failed to load"); }
    finally { setLoading(false); }
  }, [id]);

  useEffect(() => { loadAll(); }, [loadAll]);

  const handleMarkCollected = async (shareId: string, memberName: string, amount: number) => {
    if (!confirm(`Confirm you collected ₹${amount.toFixed(2)} cash from ${memberName}?`)) return;
    setCollectingId(shareId);
    try { await markInvestmentCollected(shareId); await loadAll(); toast.success("Marked collected"); }
    catch (e: any) { toast.error(e.message||"Failed"); }
    finally { setCollectingId(null); }
  };

  const handleMarkDisbursed = async () => {
    if (!allCollected) { toast.error("Collect cash from all members first"); return; }
    if (!confirm("Confirm you have GPayed the loan amount to the finder member?")) return;
    setSubmitting(true);
    try { await markDisbursed(id); await loadAll(); toast.success("Loan marked as disbursed!"); }
    catch (e: any) { toast.error(e.message||"Failed"); }
    finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!loan) return <div className="p-6 text-center text-gray-500">Loan not found</div>;

  const isDisbursed = (loan as any).disbursed === true;
  const disbDate = (loan as any).disbursementDate;
  const months = Number(loan.tenureMonths)||0;
  const paidCount = payments.filter((p: any)=>p.verified).length;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 p-4 md:p-6">
        <button onClick={()=>router.back()} className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft size={20}/></button>
        <h1 className="text-xl font-bold text-gray-900">Loan Detail</h1>
      </div>
      <div className="px-4 md:px-6 space-y-4 pb-8">
        {/* Customer */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {loan.loanNumber && <p className="text-xs font-bold text-[#4B4BF7] mb-1">{loan.loanNumber}</p>}
          <div className="flex justify-between items-start">
            <p className="text-xl font-bold text-gray-900">{loan.customerName}</p>
            <span className="text-xs font-bold bg-blue-100 text-blue-700 px-2 py-1 rounded-full">{loan.status}</span>
          </div>
          <p className="text-sm text-gray-500 mt-1">👨‍💼 {loan.finderMemberName}</p>
        </div>

        {/* Amount */}
        <div className="bg-[#EEF2FF] rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold text-[#4B4BF7]">Loan Amount</p>
          <p className="text-4xl font-black text-[#4B4BF7] mt-1">{formatCurrency(loan.requestedAmt)}</p>
        </div>

        {/* Disbursement */}
        <div className={`rounded-2xl p-4 shadow-sm ${isDisbursed?"bg-green-50":"bg-amber-50"}`}>
          <p className="text-xs font-bold uppercase tracking-wide mb-1 {isDisbursed?'text-green-600':'text-amber-600'}">
            {isDisbursed?"✅ Disbursed":"⏳ Awaiting Disbursement"}
          </p>
          {disbDate && <p className="text-lg font-bold text-gray-900">{fmtDisb(disbDate)}</p>}
          {!isDisbursed && <p className="text-xs text-amber-700 mt-1">GPay loan amount to finder member, then mark disbursed.</p>}
        </div>

        {/* EMI Progress */}
        {months > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">EMI Progress</p>
              <button onClick={()=>router.push(`/admin/active-loans/${id}/schedule`)} className="text-xs text-[#4B4BF7] font-semibold">Full Schedule ›</button>
            </div>
            <div className="h-2 bg-gray-100 rounded-full mb-2">
              <div className="h-2 bg-[#4B4BF7] rounded-full" style={{width:`${Math.round(paidCount/months*100)}%`}} />
            </div>
            <p className="text-xs text-gray-500">{paidCount} of {months} EMIs verified · {months-paidCount} remaining</p>
          </div>
        )}

        {/* Member contributions with collection tracking */}
        {shares.length > 0 && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Member Contributions</p>
            {shares.map((sh: any) => {
              const fromRet = Number(sh.fromReturns)||0;
              const fromInv = Number(sh.fromInvestment)||0;
              return (
                <div key={sh.shareId} className="py-3 border-t border-gray-50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">{sh.memberName}</p>
                      <p className="text-xs text-gray-400">{formatCurrency(sh.shareAmt)} · {((Number(sh.shareRatio)||0)*100).toFixed(1)}%</p>
                    </div>
                  </div>
                  {fromRet > 0 && <p className="text-xs text-green-600 mt-1">✓ From returns: {formatCurrency(fromRet)}</p>}
                  {fromInv > 0 && (
                    <div className="flex items-center justify-between mt-1">
                      <p className="text-xs text-amber-600">📦 Collect: {formatCurrency(fromInv)}</p>
                      {sh.investmentCollected ? (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-semibold">✓ Collected</span>
                      ) : !isDisbursed && (
                        <button onClick={()=>handleMarkCollected(sh.shareId||sh.id, sh.memberName, fromInv)}
                          disabled={collectingId===sh.shareId||collectingId===sh.id}
                          className="text-xs bg-amber-500 text-white px-3 py-1 rounded-lg font-semibold disabled:opacity-60">
                          {collectingId===sh.shareId||collectingId===sh.id?"...":"Mark Collected"}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
            {shares.some((s:any)=>s.fromInvestment>0) && (
              <div className="mt-3 p-3 bg-amber-50 rounded-xl flex justify-between">
                <p className="text-xs text-amber-700 font-medium">Total to collect:</p>
                <p className="text-xs font-bold text-amber-700">{formatCurrency(shares.reduce((s:number,c:any)=>s+Number(c.fromInvestment||0),0))}</p>
              </div>
            )}
          </div>
        )}

        {/* Mark disbursed */}
        {!isDisbursed && (
          <div className="space-y-3">
            {!allCollected && (
              <div className="p-3 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-700 font-semibold">⚠️ Collect cash from all members before disbursing</p>
              </div>
            )}
            <button onClick={handleMarkDisbursed} disabled={submitting||!allCollected}
              className="w-full py-3 bg-[#4B4BF7] text-white font-bold rounded-xl hover:bg-[#3b3be0] disabled:opacity-50">
              {submitting?"Updating...":"✅ Mark as Disbursed"}
            </button>
            <button onClick={()=>{if(confirm("Cancel loan? Contributions will be refunded.")) cancelLoan(id).then(()=>{toast.success("Cancelled");router.back();}).catch((e:any)=>toast.error(e.message));}}
              className="w-full py-3 border-2 border-red-300 text-red-500 font-bold rounded-xl hover:bg-red-50">
              Cancel Loan (Refund Members)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
