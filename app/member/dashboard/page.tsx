"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getOrCreateWallet } from "@/controllers/WalletController";
import { getLoansByMember } from "@/controllers/LoanController";
import { formatCurrency } from "@/utils/Formatters";
import { Plus, FileText, Wallet, PieChart } from "lucide-react";

export default function MemberDashboard() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const [wallet, setWallet] = useState<any>(null);
  const [myLoansCount, setMyLoansCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userProfile) return;
    Promise.all([
      getOrCreateWallet(userProfile.uid, userProfile.name),
      getLoansByMember(userProfile.uid),
    ]).then(([w, loans]) => {
      setWallet(w);
      setMyLoansCount(loans.length);
    }).catch(console.error).finally(() => setLoading(false));
  }, [userProfile]);

  if (loading) return <LoadingSpinner fullPage />;

  const inv = Number(wallet?.investmentBalance) || 0;
  const ret = Number(wallet?.returnsBalance) || 0;
  const dep = Number(wallet?.deployedBalance) || 0;
  const free = Number(wallet?.freeInvestment) || Math.max(0, inv - dep);

  return (
    <div className="p-4 space-y-4">
      {/* Wallet summary */}
      <div className="bg-[#4B4BF7] rounded-2xl p-5 text-white">
        <p className="text-sm text-indigo-200">Total Balance</p>
        <p className="text-4xl font-black mt-1">{formatCurrency(inv + ret)}</p>
        <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-indigo-400">
          <div>
            <p className="text-xs text-indigo-300">💼 Investment</p>
            <p className="text-xl font-bold">{formatCurrency(inv)}</p>
            <p className="text-xs text-indigo-300 mt-1">Free: <span className="text-green-300 font-semibold">{formatCurrency(free)}</span></p>
          </div>
          <div>
            <p className="text-xs text-indigo-300">📈 Returns</p>
            <p className="text-xl font-bold">{formatCurrency(ret)}</p>
            <p className="text-xs text-indigo-300 mt-1">Withdrawable</p>
          </div>
        </div>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-2 gap-3">
        <button onClick={() => router.push("/member/loans/new")}
          className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-shadow active:scale-[0.98]">
          <div className="w-12 h-12 bg-[#EEF2FF] rounded-xl flex items-center justify-center">
            <Plus size={24} className="text-[#4B4BF7]" />
          </div>
          <p className="text-sm font-bold text-gray-900">New Loan</p>
        </button>
        <button onClick={() => router.push("/member/wallet")}
          className="bg-white rounded-2xl p-4 shadow-sm flex flex-col items-center gap-2 hover:shadow-md transition-shadow active:scale-[0.98]">
          <div className="w-12 h-12 bg-green-50 rounded-xl flex items-center justify-center">
            <Wallet size={24} className="text-green-600" />
          </div>
          <p className="text-sm font-bold text-gray-900">My Wallet</p>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <div onClick={() => router.push("/member/loans")}
          className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md">
          <FileText size={20} className="text-[#4B4BF7] mb-2" />
          <p className="text-2xl font-black text-gray-900">{myLoansCount}</p>
          <p className="text-xs text-gray-500 mt-1">My Loans</p>
        </div>
        <div onClick={() => router.push("/member/contributions")}
          className="bg-white rounded-2xl p-4 shadow-sm cursor-pointer hover:shadow-md">
          <PieChart size={20} className="text-purple-500 mb-2" />
          <p className="text-2xl font-black text-gray-900">{dep > 0 ? formatCurrency(dep) : "₹0"}</p>
          <p className="text-xs text-gray-500 mt-1">Deployed</p>
        </div>
      </div>

      {/* Quick links */}
      <div className="bg-white rounded-2xl shadow-sm divide-y divide-gray-50">
        {[
          { label: "All Loans", href: "/member/loans", icon: "📋" },
          { label: "My Contributions", href: "/member/contributions", icon: "💼" },
          { label: "Request Withdrawal", href: "/member/wallet", icon: "💸" },
          { label: "Notifications", href: "/member/notifications", icon: "🔔" },
        ].map(item => (
          <a key={item.href} href={item.href}
            className="flex items-center gap-4 px-4 py-4 hover:bg-gray-50 transition-colors">
            <span className="text-xl">{item.icon}</span>
            <span className="font-medium text-gray-800 text-sm">{item.label}</span>
            <span className="ml-auto text-gray-300 text-lg">›</span>
          </a>
        ))}
      </div>
    </div>
  );
}
