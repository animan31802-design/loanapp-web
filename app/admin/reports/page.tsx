"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getAllLoans } from "@/controllers/LoanController";
import { getAllWallets } from "@/controllers/WalletController";
import { getAllMembers } from "@/controllers/TeamController";
import { formatCurrency } from "@/utils/Formatters";
import { LoanStatus } from "@/constants/Enums";
import { toast } from "sonner";

export default function ReportsPage() {
  const [loanStats, setLoanStats] = useState({ total:0,pending:0,active:0,closed:0,rejected:0,totalDisbursed:0 });
  const [members, setMembers] = useState<any[]>([]);
  const [totalPool, setTotalPool] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([getAllLoans(), getAllWallets(), getAllMembers()]).then(([loans, wallets, mems]) => {
      setLoanStats({
        total: loans.length,
        pending: loans.filter(l=>l.status===LoanStatus.PENDING).length,
        active: loans.filter(l=>l.status===LoanStatus.ACTIVE).length,
        closed: loans.filter(l=>(l.status as string)==="CLOSED").length,
        rejected: loans.filter(l=>l.status===LoanStatus.REJECTED).length,
        totalDisbursed: loans.filter(l=>l.status===LoanStatus.ACTIVE||(l.status as string)==="CLOSED").reduce((s,l)=>s+Number(l.requestedAmt),0),
      });
      const walletMap: Record<string,any> = {};
      wallets.forEach((w:any)=>{ walletMap[w.memberId]=w; });
      const memReports = mems.map((m:any)=>({
        ...m,
        investmentBalance: Number(walletMap[m.uid]?.investmentBalance)||0,
        deployedBalance: Number(walletMap[m.uid]?.deployedBalance)||0,
        freeInvestment: Number(walletMap[m.uid]?.freeInvestment)||0,
        returnsBalance: Number(walletMap[m.uid]?.returnsBalance)||0,
        totalBalance: Number(walletMap[m.uid]?.totalBalance)||0,
        totalEarned: Number(walletMap[m.uid]?.totalEarned)||0,
        totalWithdrawn: Number(walletMap[m.uid]?.totalWithdrawn)||0,
      }));
      setMembers(memReports);
      setTotalPool(memReports.reduce((s,m)=>s+m.totalBalance,0));
    }).catch((e:any)=>toast.error(e.message)).finally(()=>setLoading(false));
  }, []);

  if (loading) return <><PageHeader title="Reports" /><LoadingSpinner /></>;

  return (
    <div>
      <PageHeader title="Reports"
        action={
          <button onClick={()=>toast.info("Excel export coming soon!")}
            className="px-4 py-2 bg-green-600 text-white text-sm font-semibold rounded-xl hover:bg-green-700">
            📊 Export
          </button>
        } />
      <div className="px-4 md:px-6 space-y-6 pb-8">
        {/* Pool total */}
        <div className="bg-[#4B4BF7] rounded-2xl p-6 text-center text-white">
          <p className="text-sm text-indigo-200">Total Pool Balance</p>
          <p className="text-5xl font-black mt-2">{formatCurrency(totalPool)}</p>
          <p className="text-sm text-indigo-300 mt-1">Across {members.length} members</p>
        </div>

        {/* Loan stats */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Loan Overview</h2>
          <div className="grid grid-cols-2 gap-3 mb-3">
            {[["Total","bg-gray-50","text-gray-900",loanStats.total],["Pending","bg-amber-50","text-amber-600",loanStats.pending],["Active","bg-blue-50","text-blue-600",loanStats.active],["Closed","bg-green-50","text-green-600",loanStats.closed]].map(([l,bg,col,v])=>(
              <div key={String(l)} className={`${bg} rounded-2xl p-4 text-center`}>
                <p className={`text-3xl font-black ${col}`}>{v}</p>
                <p className="text-xs text-gray-500 mt-1">{l}</p>
              </div>
            ))}
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm flex justify-between items-center">
            <p className="font-semibold text-gray-700">Total Disbursed</p>
            <p className="text-xl font-black text-[#4B4BF7]">{formatCurrency(loanStats.totalDisbursed)}</p>
          </div>
        </div>

        {/* Member breakdown */}
        <div>
          <h2 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">Member Breakdown</h2>
          <div className="space-y-3">
            {members.map(m => (
              <div key={m.uid} className="bg-white rounded-2xl p-4 shadow-sm">
                <p className="font-bold text-gray-900 mb-3">{m.name}</p>
                <div className="grid grid-cols-2 gap-4 mb-3">
                  <div>
                    <p className="text-xs font-semibold text-indigo-500 mb-2">💼 Investment</p>
                    {[["Total",m.investmentBalance],["Free",m.freeInvestment,"text-green-600"],["Deployed",m.deployedBalance,"text-amber-600"]].map(([l,v,c])=>(
                      <div key={String(l)} className="flex justify-between py-1">
                        <span className="text-xs text-gray-500">{l}</span>
                        <span className={`text-xs font-bold ${c||"text-gray-900"}`}>{formatCurrency(Number(v))}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-green-500 mb-2">📈 Returns</p>
                    {[["Balance",m.returnsBalance,"text-[#4B4BF7]"],["Earned",m.totalEarned,"text-green-600"],["Withdrawn",m.totalWithdrawn,"text-red-500"]].map(([l,v,c])=>(
                      <div key={String(l)} className="flex justify-between py-1">
                        <span className="text-xs text-gray-500">{l}</span>
                        <span className={`text-xs font-bold ${c}`}>{formatCurrency(Number(v))}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex justify-between pt-3 border-t border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Total Balance</span>
                  <span className="text-lg font-black text-[#4B4BF7]">{formatCurrency(m.totalBalance)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
