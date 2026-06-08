"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { getSharesByMember } from "@/controllers/ShareController";
import { getLoanById } from "@/controllers/LoanController";
import { getEMIPaymentsByLoan } from "@/controllers/EMIController";
import { formatCurrency } from "@/utils/Formatters";
import { LoanMode } from "@/constants/Enums";

const modeLabel = (m: string|null) =>
  m===LoanMode.FLAT_EMI?"Flat EMI":m===LoanMode.INTEREST_ONLY?"Interest Only":"Reducing EMI";

export default function ContributionsPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;
    (async () => {
      try {
        const shares = await getSharesByMember(userProfile.uid);
        const enriched = await Promise.all(shares.map(async (s: any) => {
          const loan = await getLoanById(s.loanId).catch(() => null);
          const payments = loan ? await getEMIPaymentsByLoan(s.loanId).catch(() => []) : [];
          const verified = payments.filter((p: any) => p.verified);
          const returnsEarned = verified.reduce((sum: number, p: any) => {
            const principal = Number(p.principalPortion) || 0;
            const interest = Number(p.interestPortion) || 0;
            return sum + (principal * Number(s.shareRatio)) + ((interest * 0.9) * Number(s.shareRatio));
          }, 0);
          return { ...s, loan, paidCount: verified.length, months: Number(loan?.tenureMonths)||0, returnsEarned: Math.round(returnsEarned*100)/100, isDisbursed: (loan as any)?.disbursed===true };
        }));
        enriched.sort((a,b) => (a.loan?.status==="ACTIVE"?-1:1) - (b.loan?.status==="ACTIVE"?-1:1));
        setItems(enriched);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, [userProfile]);

  const totalContributed = items.reduce((s, i) => s + Number(i.shareAmt), 0);
  const totalReturns = items.reduce((s, i) => s + Number(i.returnsEarned), 0);
  const activeCount = items.filter(i => i.loan?.status === "ACTIVE").length;

  return (
    <div>
      <PageHeader title="My Contributions" />
      <div className="px-4 space-y-4 pb-10">
        {loading ? <LoadingSpinner /> : (
          <>
            {items.length > 0 && (
              <div className="bg-[#4B4BF7] rounded-2xl p-4 text-white flex justify-between">
                <div className="text-center flex-1">
                  <p className="text-xs text-indigo-200">Contributed</p>
                  <p className="text-xl font-black">{formatCurrency(totalContributed)}</p>
                </div>
                <div className="w-px bg-indigo-400 mx-2" />
                <div className="text-center flex-1">
                  <p className="text-xs text-indigo-200">Returns Earned</p>
                  <p className="text-xl font-black text-green-300">{formatCurrency(totalReturns)}</p>
                </div>
                <div className="w-px bg-indigo-400 mx-2" />
                <div className="text-center flex-1">
                  <p className="text-xs text-indigo-200">Active Loans</p>
                  <p className="text-xl font-black">{activeCount}</p>
                </div>
              </div>
            )}

            {items.length === 0 ? (
              <EmptyState icon="💼" title="No Contributions Yet" subtitle="Your loan contributions appear here after a loan is approved" />
            ) : items.map((item: any) => (
              <div key={item.shareId||item.id}
                onClick={() => item.loan && router.push(`/member/loans/${(item.loan as any).id||item.loan.loanId}`)}
                className="bg-white rounded-2xl shadow-sm overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                <div className="p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      {item.loan?.loanNumber && <p className="text-xs font-bold text-[#4B4BF7] mb-0.5">{item.loan.loanNumber}</p>}
                      <p className="font-bold text-gray-900">{item.loan?.customerName||"—"}</p>
                      <p className="text-xs text-gray-400">{item.loan?.planName} · {modeLabel(item.loan?.mode)}</p>
                    </div>
                    <span className={`text-xs font-bold px-2 py-1 rounded-full ${item.loan?.status==="ACTIVE"?"bg-blue-100 text-blue-700":item.loan?.status==="PENDING"?"bg-amber-100 text-amber-700":"bg-green-100 text-green-700"}`}>
                      {item.loan?.status||"—"}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2">
                    {[["My Share",formatCurrency(item.shareAmt),""],["Ratio",`${((Number(item.shareRatio)||0)*100).toFixed(1)}%`,""],["EMIs",`${item.paidCount}/${item.months}`,""],["Returns",formatCurrency(item.returnsEarned),"text-green-600"]].map(([l,v,c])=>(
                      <div key={l} className="text-center">
                        <p className="text-xs text-gray-400">{l}</p>
                        <p className={`text-sm font-bold ${c||"text-gray-900"}`}>{v}</p>
                      </div>
                    ))}
                  </div>
                </div>
                <div className={`px-4 py-2 text-xs font-semibold ${item.isDisbursed?"bg-green-50 text-green-700":"bg-amber-50 text-amber-700"}`}>
                  {item.isDisbursed ? `✅ Disbursed · EMI ${item.paidCount}/${item.months} verified` : "⏳ Awaiting disbursement"}
                </div>
              </div>
            ))}
          </>
        )}
      </div>
    </div>
  );
}
