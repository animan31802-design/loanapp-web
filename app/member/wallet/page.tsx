"use client";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getOrCreateWallet, getWalletTransactions, addInvestment, reduceInvestment } from "@/controllers/WalletController";
import { requestWithdrawal } from "@/controllers/WithdrawalController";
import { getSettings } from "@/controllers/SettingsController";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import { toast } from "sonner";

const TXN_CONFIG: Record<string, { color: string; bg: string; sign: string }> = {
  INVESTMENT:        { color: "text-blue-700",  bg: "bg-blue-50",   sign: "+" },
  INVESTMENT_REDUCE: { color: "text-red-600",   bg: "bg-red-50",    sign: "-" },
  COMMISSION:        { color: "text-green-700", bg: "bg-green-50",  sign: "+" },
  SHARE_CREDIT:      { color: "text-purple-700",bg: "bg-purple-50", sign: "+" },
  WITHDRAWAL:        { color: "text-red-600",   bg: "bg-red-50",    sign: "-" },
  LOAN_CONTRIBUTION: { color: "text-amber-700", bg: "bg-amber-50",  sign: "-" },
  LOAN_REFUND:       { color: "text-green-700", bg: "bg-green-50",  sign: "+" },
};

export default function WalletPage() {
  const { userProfile } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [txns, setTxns] = useState<any[]>([]);
  const [minInv, setMinInv] = useState(50);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState<"invest" | "reduce" | "withdraw" | null>(null);
  const [inputAmt, setInputAmt] = useState("");
  const [saving, setSaving] = useState(false);

  const loadData = async () => {
    if (!userProfile) return;
    try {
      const [w, t, s] = await Promise.all([
        getOrCreateWallet(userProfile.uid, userProfile.name),
        getWalletTransactions(userProfile.uid),
        getSettings().catch(() => ({ minInvestmentAmount: 50 })),
      ]);
      setWallet(w); setTxns(t); setMinInv(Number(s?.minInvestmentAmount) || 50);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, [userProfile]);

  const handleAction = async () => {
    const amt = parseFloat(inputAmt);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter valid amount"); return; }
    if (!userProfile) return;
    setSaving(true);
    try {
      if (modal === "invest") {
        if (amt < minInv) { toast.error(`Minimum investment is ${formatCurrency(minInv)}`); return; }
        await addInvestment(userProfile.uid, userProfile.name, amt);
        toast.success(`${formatCurrency(amt)} added to wallet!`);
      } else if (modal === "reduce") {
        await reduceInvestment(userProfile.uid, amt);
        toast.success(`Investment reduced by ${formatCurrency(amt)}`);
      } else if (modal === "withdraw") {
        await requestWithdrawal({ memberId: userProfile.uid, memberName: userProfile.name, amount: amt });
        toast.success("Withdrawal request submitted!");
      }
      setModal(null); setInputAmt(""); loadData();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <><PageHeader title="My Wallet" /><LoadingSpinner /></>;

  const inv = Number(wallet?.investmentBalance) || 0;
  const dep = Number(wallet?.deployedBalance) || 0;
  const free = Number(wallet?.freeInvestment) || Math.max(0, inv - dep);
  const ret = Number(wallet?.returnsBalance) || 0;

  return (
    <div>
      <PageHeader title="My Wallet" />
      <div className="px-4 space-y-4 pb-10">
        {/* Wallet card */}
        <div className="bg-[#4B4BF7] rounded-2xl p-5 text-white">
          <p className="text-sm text-indigo-200">Total Balance</p>
          <p className="text-4xl font-black mt-1">{formatCurrency(inv + ret)}</p>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-indigo-400">
            <div>
              <p className="text-xs text-indigo-300">💼 Investment</p>
              <p className="text-xl font-bold">{formatCurrency(inv)}</p>
              <div className="flex gap-4 mt-1">
                <div><p className="text-xs text-indigo-300">Free</p><p className="text-sm font-semibold text-green-300">{formatCurrency(free)}</p></div>
                <div><p className="text-xs text-indigo-300">Deployed</p><p className="text-sm font-semibold text-yellow-300">{formatCurrency(dep)}</p></div>
              </div>
            </div>
            <div>
              <p className="text-xs text-indigo-300">📈 Returns</p>
              <p className="text-xl font-bold">{formatCurrency(ret)}</p>
              <p className="text-xs text-green-300 mt-1">Withdrawable</p>
            </div>
          </div>
          <p className="text-xs text-indigo-300 mt-3 pt-3 border-t border-indigo-400 text-center">
            Withdrawable: {formatCurrency(ret)} · Reducible: {formatCurrency(free)}
          </p>
        </div>

        {/* Actions */}
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Add Investment", action: "invest" as const, bg: "bg-[#4B4BF7]", text: "text-white" },
            { label: "Reduce Free", action: "reduce" as const, bg: "bg-amber-50", text: "text-amber-700" },
            { label: "Withdraw", action: "withdraw" as const, bg: "bg-green-50", text: "text-green-700" },
          ].map(b => (
            <button key={b.action} onClick={() => { setModal(b.action); setInputAmt(""); }}
              className={`py-3 rounded-xl text-xs font-bold ${b.bg} ${b.text} hover:opacity-90 transition-opacity`}>
              {b.label}
            </button>
          ))}
        </div>

        {/* Transactions */}
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-3">Transaction History</p>
          {txns.length === 0 ? (
            <p className="text-center text-gray-400 py-8">No transactions yet</p>
          ) : txns.map((t: any, i) => {
            const cfg = TXN_CONFIG[t.type] || { color: "text-gray-700", bg: "bg-gray-50", sign: "+" };
            return (
              <div key={t.id || i} className="bg-white rounded-xl p-3 mb-2 flex justify-between items-center">
                <div className="flex-1 min-w-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>{t.type?.replace(/_/g," ")}</span>
                  <p className="text-xs text-gray-500 mt-1 truncate">{t.note}</p>
                  <p className="text-xs text-gray-300">{formatDate(t.createdAt)}</p>
                </div>
                <p className={`font-bold text-sm ml-3 ${Number(t.amount)>=0?"text-green-600":"text-red-500"}`}>
                  {cfg.sign}{formatCurrency(Math.abs(Number(t.amount)))}
                </p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6">
            <h2 className="text-lg font-bold mb-1">
              {modal === "invest" ? "Add Investment" : modal === "reduce" ? "Reduce Free Investment" : "Request Withdrawal"}
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              {modal === "invest" ? `Minimum: ${formatCurrency(minInv)}` :
               modal === "reduce" ? `Available to reduce: ${formatCurrency(free)}` :
               `Withdrawable returns: ${formatCurrency(ret)}`}
            </p>
            <input type="number" value={inputAmt} onChange={e=>setInputAmt(e.target.value)}
              placeholder="Enter amount (₹)" autoFocus
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7] mb-4" />
            <div className="flex gap-3">
              <button onClick={() => { setModal(null); setInputAmt(""); }}
                className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl">Cancel</button>
              <button onClick={handleAction} disabled={saving}
                className="flex-1 py-3 bg-[#4B4BF7] text-white font-bold rounded-xl disabled:opacity-60">
                {saving ? "..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
