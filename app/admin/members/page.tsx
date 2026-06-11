"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import RefreshButton from "@/components/shared/RefreshButton";
import { getAllMembers } from "@/controllers/TeamController";
import { getAllWallets } from "@/controllers/WalletController";
import { formatCurrency } from "@/utils/Formatters";
import { Plus } from "lucide-react";

export default function MembersPage() {
  const router = useRouter();
  const [members, setMembers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [mems, wallets] = await Promise.all([getAllMembers(), getAllWallets()]);
      const walletMap: Record<string, number> = {};
      wallets.forEach((w: any) => { walletMap[w.memberId] = Number(w.totalBalance) || 0; });
      setMembers(mems.map((m: any) => ({ ...m, totalBalance: walletMap[m.uid] || 0 })));
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <div>
      <PageHeader title="Members" subtitle={`${members.length} members`}
        action={
          <div className="flex items-center gap-2">
            <RefreshButton onRefresh={loadData} />
            <button onClick={() => router.push("/admin/members/new")}
              className="flex items-center gap-2 bg-[#4B4BF7] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3b3be0]">
              <Plus size={16} /> Add
            </button>
          </div>
        } />
      <div className="px-4 md:px-6 space-y-3">
        {loading ? <LoadingSpinner /> : members.length === 0 ? (
          <EmptyState icon="👥" title="No Members Yet" subtitle="Add members to get started" />
        ) : members.map((m: any) => (
          <div key={m.uid} onClick={() => router.push(`/admin/members/${m.uid}`)}
            className="bg-white rounded-2xl p-4 shadow-sm flex items-center gap-4 cursor-pointer hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-[#EEF2FF] rounded-full flex items-center justify-center shrink-0">
              <span className="text-[#4B4BF7] font-bold text-lg">{m.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900">{m.name}</p>
              <p className="text-sm text-gray-500">{m.phone}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">Wallet</p>
              <p className="font-bold text-[#4B4BF7]">{formatCurrency(m.totalBalance)}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}