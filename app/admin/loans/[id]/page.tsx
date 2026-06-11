"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getLoanById, approveLoan, rejectLoan, cancelLoan, setDisbursementDate } from "@/controllers/LoanController";
import { getAllWallets } from "@/controllers/WalletController";
import { getAllMembers } from "@/controllers/TeamController";
import { notifyInsufficientFunds } from "@/controllers/NotificationController";
import { calculateProportionalContributions } from "@/utils/WalletCalculator";
import { formatCurrency } from "@/utils/Formatters";
import { LoanStatus, LoanMode } from "@/constants/Enums";
import { Loan } from "@/models/Loan";
import { toast } from "sonner";

const MONTH_NAMES = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const fmtMonth = (v: string) => { if (!v) return "—"; const [y,m] = v.split("-"); return `${MONTH_NAMES[parseInt(m)-1]} ${y}`; };
const modeLabel = (m: string|null) => m === LoanMode.FLAT_EMI ? "Flat EMI" : m === LoanMode.INTEREST_ONLY ? "Interest Only" : m === LoanMode.EMI ? "Reducing EMI" : m || "—";

const buildDateOptions = () => {
  const now = new Date(); const opts = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-01`;
    opts.push({ value, label: `1 ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
};

export default function LoanApprovalPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [loan, setLoan] = useState<Loan | null>(null);
  const [contributions, setContributions] = useState<any[]>([]);
  const [totalAvailable, setTotalAvailable] = useState(0);
  const [canFund, setCanFund] = useState(false);
  const [shortfall, setShortfall] = useState(0);
  const [disbDate, setDisbDate] = useState(buildDateOptions()[1].value);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notifying, setNotifying] = useState(false);
  const dateOptions = buildDateOptions();

  useEffect(() => { if (id) loadData(); }, [id]);

  const loadData = async () => {
    try {
      const [loanData, members, wallets] = await Promise.all([getLoanById(id), getAllMembers(), getAllWallets()]);
      if (!loanData) { toast.error("Loan not found"); return; }
      setLoan(loanData as Loan);
      const walletMap: Record<string, { inv: number; ret: number }> = {};
      wallets.forEach((w: any) => { walletMap[w.memberId] = { inv: Number(w.investmentBalance)||0, ret: Number(w.returnsBalance)||0 }; });
      const memberWallets = members.map((m: any) => ({ memberId: m.uid, memberName: m.name, investmentBalance: walletMap[m.uid]?.inv||0, returnsBalance: walletMap[m.uid]?.ret||0 }));
      const result = calculateProportionalContributions(Number(loanData.requestedAmt), memberWallets);
      setContributions(result.contributions); setTotalAvailable(result.totalAvailable); setCanFund(result.canFund); setShortfall(result.shortfall);
    } catch (e: any) { toast.error(e.message || "Failed to load"); }
    finally { setLoading(false); }
  };

  const handleApprove = async () => {
    if (!canFund) { toast.error(`Insufficient funds. Shortfall: ${formatCurrency(shortfall)}`); return; }
    if (!confirm(`Approve loan?\n\nThis will deduct contributions from all member wallets. Disbursement date: ${dateOptions.find(d=>d.value===disbDate)?.label}`)) return;
    setSubmitting(true);
    try {
      await approveLoan({ loanId: id, interestRate: Number(loan?.interestRatePerHundred)||0, mode: (loan?.mode as LoanMode)||LoanMode.FLAT_EMI, tenureMonths: Number(loan?.tenureMonths)||0 });
      await setDisbursementDate(id, disbDate);
      toast.success("Loan approved! Wallets updated.");
      router.back();
    } catch (e: any) { toast.error(e.message || "Failed to approve"); }
    finally { setSubmitting(false); }
  };

  const handleReject = async () => {
    if (!confirm("Reject this loan request?")) return;
    setSubmitting(true);
    try { await rejectLoan(id); toast.success("Loan rejected"); router.back(); }
    catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel loan? Contributions will be refunded to wallets.")) return;
    setSubmitting(true);
    try { await cancelLoan(id); toast.success("Loan cancelled. Contributions refunded."); router.back(); }
    catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSubmitting(false); }
  };

  const handleNotify = async () => {
    setNotifying(true);
    try { await notifyInsufficientFunds(loan?.loanNumber||id, loan?.customerName||"", Number(loan?.requestedAmt), totalAvailable, shortfall); toast.success("Members notified!"); }
    catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setNotifying(false); }
  };

  if (loading) return <LoadingSpinner fullPage />;
  if (!loan) return <div className="p-6 text-center text-gray-500">Loan not found</div>;

  const isPending = loan.status === LoanStatus.PENDING || loan.status === LoanStatus.FUNDED;
  const isFunded = loan.status === LoanStatus.FUNDED;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 p-4 md:p-6">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">Loan Approval</h1>
      </div>
      <div className="px-4 md:px-6 space-y-4 pb-8">
        {/* Customer */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          {loan.loanNumber && <p className="text-xs font-bold text-[#4B4BF7] mb-2">{loan.loanNumber}</p>}
          <p className="text-xl font-bold text-gray-900">{loan.customerName}</p>
          {loan.customerPhone && <p className="text-sm text-gray-500 mt-1">📞 {loan.customerPhone}</p>}
          <p className="text-sm text-gray-500 mt-1">👨‍💼 Finder: {loan.finderMemberName}</p>
          <p className="text-sm text-gray-500 mt-1">🗓️ Request Month: {fmtMonth(loan.requestMonth)}</p>
        </div>

        {/* Amount */}
        <div className="bg-[#EEF2FF] rounded-2xl p-5 text-center">
          <p className="text-sm font-semibold text-[#4B4BF7]">Loan Amount</p>
          <p className="text-4xl font-black text-[#4B4BF7] mt-1">{formatCurrency(loan.requestedAmt)}</p>
        </div>

        {/* Plan */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Plan Details</p>
          <div className="grid grid-cols-2 gap-3">
            {[["Plan", loan.planName||"—"],["Duration",`${loan.tenureMonths||"—"} months`],["Interest",`₹${loan.interestRatePerHundred}/₹100/mo`],["Mode",modeLabel(loan.mode)]].map(([l,v])=>(
              <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="font-bold text-gray-900 mt-0.5">{v}</p></div>
            ))}
          </div>
        </div>

        {/* Disbursement date */}
        {isPending && (
          <div className="bg-white rounded-2xl p-4 shadow-sm">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Disbursement Date</p>
            <select value={disbDate} onChange={e=>setDisbDate(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7]">
              {dateOptions.map(d=><option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
        )}

        {/* Wallet contributions */}
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold text-gray-400 uppercase tracking-wide">Member Contributions</p>
            <span className={`text-xs font-bold px-2 py-1 rounded-full ${canFund?"bg-green-100 text-green-700":"bg-red-100 text-red-700"}`}>
              {canFund?"✓ Sufficient":"✗ Insufficient"}
            </span>
          </div>
          {isFunded && (
            <div className="mb-3 p-3 bg-blue-50 rounded-xl">
              <p className="text-xs text-blue-700 font-semibold">✅ Loan is FUNDED — wallet deductions already applied. Approving will move it to ACTIVE without re-deducting.</p>
            </div>
          )}
          <p className="text-xs text-gray-500 mb-3">Total available: {formatCurrency(totalAvailable)}{!canFund && ` · Shortfall: ${formatCurrency(shortfall)}`}</p>
          {contributions.map(c=>(
            <div key={c.memberId} className="flex items-center justify-between py-2 border-t border-gray-50">
              <div>
                <p className="text-sm font-semibold text-gray-900">{c.memberName}</p>
                <p className="text-xs text-gray-400">Wallet: {formatCurrency(c.walletBalance)}</p>
                {canFund && <div className="mt-1 space-y-0.5">
                  {c.fromReturns>0 && <p className="text-xs text-green-600">✓ From returns: {formatCurrency(c.fromReturns)}</p>}
                  {c.fromInvestment>0 && <p className="text-xs text-amber-600">📦 Collect: {formatCurrency(c.fromInvestment)}</p>}
                </div>}
              </div>
              <div className="text-right">
                <p className="font-bold text-[#4B4BF7]">{canFund?formatCurrency(c.totalContribute):"—"}</p>
                {canFund && <p className="text-xs text-gray-400">{(c.shareRatio*100).toFixed(1)}%</p>}
              </div>
            </div>
          ))}
          {!canFund && (
            <div className="mt-3 p-3 bg-red-50 rounded-xl">
              <p className="text-xs text-red-700 mb-2">⚠️ Members need ₹{shortfall.toFixed(2)} more before approving.</p>
              <button onClick={handleNotify} disabled={notifying}
                className="w-full py-2 bg-red-500 text-white text-xs font-bold rounded-lg hover:bg-red-600 disabled:opacity-60">
                {notifying?"Sending...":"🔔 Notify All Members"}
              </button>
            </div>
          )}
          {canFund && contributions.some(c=>c.fromInvestment>0) && (
            <div className="mt-3 p-3 bg-amber-50 rounded-xl flex justify-between">
              <p className="text-xs text-amber-700">Total to collect physically:</p>
              <p className="text-xs font-bold text-amber-700">{formatCurrency(contributions.reduce((s,c)=>s+c.fromInvestment,0))}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        {isPending && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button onClick={handleReject} disabled={submitting}
                className="py-3 bg-red-50 text-red-600 font-bold rounded-xl hover:bg-red-100 disabled:opacity-60">
                Reject
              </button>
              <button onClick={handleApprove} disabled={submitting||!canFund}
                className="py-3 bg-[#4B4BF7] text-white font-bold rounded-xl hover:bg-[#3b3be0] disabled:opacity-60">
                {submitting?"Approving...":"Approve"}
              </button>
            </div>
            <button onClick={handleCancel} disabled={submitting}
              className="w-full py-3 border-2 border-red-300 text-red-500 font-bold rounded-xl hover:bg-red-50 disabled:opacity-60">
              Cancel Loan Request
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
