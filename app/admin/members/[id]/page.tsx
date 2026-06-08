"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getDoc, COLLECTIONS } from "@/services/FirebaseService";
import { getWalletByMember, getWalletTransactions } from "@/controllers/WalletController";
import { getLoansByMember } from "@/controllers/LoanController";
import { getSharesByMember } from "@/controllers/ShareController";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import { toast } from "sonner";

export default function MemberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [member, setMember] = useState<any>(null);
  const [wallet, setWallet] = useState<any>(null);
  const [loans, setLoans] = useState<any[]>([]);
  const [shares, setShares] = useState<any[]>([]);
  const [txns, setTxns] = useState<any[]>([]);
  const [tab, setTab] = useState<"wallet" | "loans" | "shares">("wallet");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      getDoc(COLLECTIONS.USERS, id),
      getWalletByMember(id),
      getWalletTransactions(id),
      getLoansByMember(id),
      getSharesByMember(id),
    ]).then(([m, w, t, l, s]) => {
      setMember(m); setWallet(w); setTxns(t); setLoans(l); setShares(s);
    }).catch((e: any) => toast.error(e.message)).finally(() => setLoading(false));
  }, [id]);

  if (loading) return <LoadingSpinner fullPage />;
  if (!member) return <div className="p-6 text-center text-gray-500">Member not found</div>;

  const inv = Number(wallet?.investmentBalance) || 0;
  const ret = Number(wallet?.returnsBalance) || 0;
  const dep = Number(wallet?.deployedBalance) || 0;
  const free = Number(wallet?.freeInvestment) || Math.max(0, inv - dep);

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">{member.name}</h1>
      </div>
      <div className="px-4 md:px-6 space-y-4 pb-8">
        {/* Wallet card */}
        <div className="bg-[#4B4BF7] rounded-2xl p-5 text-white">
          <p className="text-sm text-indigo-200">Total Balance</p>
          <p className="text-4xl font-black mt-1">{formatCurrency(inv + ret)}</p>
          <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-indigo-400">
            <div>
              <p className="text-xs text-indigo-200">💼 Investment</p>
              <p className="text-lg font-bold">{formatCurrency(inv)}</p>
              <div className="flex gap-3 mt-1">
                <div><p className="text-xs text-indigo-300">Free</p><p className="text-sm font-semibold text-green-300">{formatCurrency(free)}</p></div>
                <div><p className="text-xs text-indigo-300">Deployed</p><p className="text-sm font-semibold text-yellow-300">{formatCurrency(dep)}</p></div>
              </div>
            </div>
            <div>
              <p className="text-xs text-indigo-200">📈 Returns</p>
              <p className="text-lg font-bold">{formatCurrency(ret)}</p>
              <div className="mt-1">
                <p className="text-xs text-indigo-300">Withdrawable</p>
                <p className="text-sm font-semibold text-green-300">{formatCurrency(ret)}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex bg-gray-100 rounded-xl p-1">
          {(["wallet", "loans", "shares"] as const).map(t => (
            <button key={t} onClick={() => setTab(t)}
              className={`flex-1 py-2 text-sm font-semibold rounded-lg capitalize transition-colors ${tab === t ? "bg-white text-[#4B4BF7] shadow-sm" : "text-gray-500"}`}>
              {t}
            </button>
          ))}
        </div>

        {tab === "wallet" && (
          <div className="space-y-2">
            {txns.length === 0 ? <p className="text-center text-gray-400 py-8">No transactions yet</p> :
              txns.slice(0, 20).map((t: any, i) => (
                <div key={t.id || i} className="bg-white rounded-xl p-3 flex justify-between items-center">
                  <div>
                    <p className="text-xs font-semibold text-gray-600">{t.type}</p>
                    <p className="text-xs text-gray-400 mt-0.5" style={{maxWidth:"200px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{t.note}</p>
                    <p className="text-xs text-gray-300">{formatDate(t.createdAt)}</p>
                  </div>
                  <p className={`font-bold ${Number(t.amount) >= 0 ? "text-green-600" : "text-red-500"}`}>{Number(t.amount)>=0?"+":""}{formatCurrency(Math.abs(Number(t.amount)))}</p>
                </div>
              ))}
          </div>
        )}
        {tab === "loans" && (
          <div className="space-y-2">
            {loans.length === 0 ? <p className="text-center text-gray-400 py-8">No loans found</p> :
              loans.map((l: any) => (
                <div key={l.loanId||l.id} className="bg-white rounded-xl p-3">
                  <p className="text-xs font-bold text-[#4B4BF7]">{l.loanNumber}</p>
                  <p className="font-semibold text-gray-900">{l.customerName}</p>
                  <div className="flex justify-between mt-1">
                    <p className="text-sm text-gray-500">{formatCurrency(l.requestedAmt)}</p>
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">{l.status}</span>
                  </div>
                </div>
              ))}
          </div>
        )}
        {tab === "shares" && (
          <div className="space-y-2">
            {shares.length === 0 ? <p className="text-center text-gray-400 py-8">No contributions</p> :
              shares.map((s: any) => (
                <div key={s.shareId||s.id} className="bg-white rounded-xl p-3 flex justify-between">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{s.loanId}</p>
                    <p className="text-xs text-gray-400">{((Number(s.shareRatio)||0)*100).toFixed(1)}% share</p>
                  </div>
                  <p className="font-bold text-[#4B4BF7]">{formatCurrency(s.shareAmt)}</p>
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
}
