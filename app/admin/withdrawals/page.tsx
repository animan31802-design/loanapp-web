"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { getPendingWithdrawals, approveWithdrawal } from "@/controllers/WithdrawalController";
import { getWalletByMember } from "@/controllers/WalletController";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import { toast } from "sonner";

export default function WithdrawalsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [approving, setApproving] = useState<string | null>(null);

  const loadData = async () => {
    try {
      const data = await getPendingWithdrawals();
      const enriched = await Promise.all(data.map(async (w: any) => {
        try { const wallet = await getWalletByMember(w.memberId); return { ...w, returnsBalance: Number(wallet?.returnsBalance) || 0 }; }
        catch { return w; }
      }));
      setItems(enriched);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleApprove = async (w: any) => {
    const ret = w.returnsBalance || 0;
    if (w.amount > ret) { toast.error(`Insufficient returns balance. Available: ${formatCurrency(ret)}`); return; }
    if (!confirm(`Pay ${formatCurrency(w.amount)} to ${w.memberName} from company account?`)) return;
    setApproving(w.withdrawalId);
    try {
      await approveWithdrawal(w.withdrawalId, w.memberId, w.amount);
      setItems(prev => prev.filter(x => x.withdrawalId !== w.withdrawalId));
      toast.success(`Paid ${formatCurrency(w.amount)} to ${w.memberName}`);
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setApproving(null); }
  };

  return (
    <div>
      <PageHeader title="Withdrawal Requests" />
      <div className="px-4 md:px-6 space-y-3">
        {loading ? <LoadingSpinner /> : items.length === 0 ? (
          <EmptyState icon="💰" title="No Pending Withdrawals" />
        ) : items.map((w: any) => {
          const canApprove = w.amount <= (w.returnsBalance || 0);
          return (
            <div key={w.withdrawalId} className="bg-white rounded-2xl p-4 shadow-sm">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <p className="font-bold text-gray-900">{w.memberName}</p>
                  <p className="text-xs text-gray-400">{formatDate(w.requestedAt)}</p>
                </div>
                <p className="text-2xl font-black text-[#4B4BF7]">{formatCurrency(w.amount)}</p>
              </div>
              <div className="flex justify-between text-sm mb-3">
                <span className="text-gray-500">Returns balance:</span>
                <span className={`font-semibold ${canApprove ? "text-green-600" : "text-red-500"}`}>{formatCurrency(w.returnsBalance || 0)}</span>
              </div>
              {!canApprove && <p className="text-xs text-red-600 bg-red-50 rounded-xl p-2 mb-3">⚠️ Requested amount exceeds returns balance.</p>}
              <button onClick={() => handleApprove(w)} disabled={!canApprove || approving === w.withdrawalId}
                className="w-full py-3 bg-[#4B4BF7] text-white font-bold rounded-xl hover:bg-[#3b3be0] disabled:opacity-50">
                {approving === w.withdrawalId ? "Processing..." : "Approve & Mark Paid"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
