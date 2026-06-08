"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/controllers/AuthController";
import { UserRole } from "@/constants/Enums";
import { toast } from "sonner";
import {
  LayoutDashboard, FileText, CheckCircle, Users, ListOrdered,
  CreditCard, Wallet, BarChart3, Settings, LogOut, Bell, ChevronRight
} from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/loans", label: "Loan Requests", icon: FileText },
  { href: "/admin/active-loans", label: "Active Loans", icon: CheckCircle },
  { href: "/admin/payments", label: "Verify Payments", icon: CreditCard },
  { href: "/admin/members", label: "Members", icon: Users },
  { href: "/admin/withdrawals", label: "Withdrawals", icon: Wallet },
  { href: "/admin/plans", label: "Loan Plans", icon: ListOrdered },
  { href: "/admin/reports", label: "Reports", icon: BarChart3 },
  { href: "/admin/settings", label: "Settings", icon: Settings },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userProfile, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!userProfile || userProfile.role !== UserRole.ADMIN)) {
      router.replace("/login");
    }
  }, [loading, userProfile, router]);

  const handleLogout = async () => {
    try { await logout(); router.replace("/login"); }
    catch { toast.error("Logout failed"); }
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-4 border-[#4B4BF7] border-t-transparent rounded-full animate-spin" />
    </div>
  );

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar — desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-gray-100 min-h-screen fixed left-0 top-0 bottom-0 z-30">
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-100">
          <div className="w-9 h-9 bg-[#4B4BF7] rounded-xl flex items-center justify-center">
            <span className="text-white text-lg font-black">₹</span>
          </div>
          <div>
            <p className="font-bold text-gray-900 text-sm">LoanApp</p>
            <p className="text-xs text-gray-400">Admin Panel</p>
          </div>
        </div>
        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className={cn("flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all",
                  active ? "bg-[#EEF2FF] text-[#4B4BF7]" : "text-gray-600 hover:bg-gray-50 hover:text-gray-900")}>
                <Icon size={18} />
                {label}
                {active && <ChevronRight size={14} className="ml-auto" />}
              </Link>
            );
          })}
        </nav>
        {/* User */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 bg-[#4B4BF7] rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">{userProfile?.name?.[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-gray-900 truncate">{userProfile?.name}</p>
              <p className="text-xs text-gray-400">Admin</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 rounded-xl transition-colors">
            <LogOut size={16} /> Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 md:ml-64">
        {/* Mobile header */}
        <header className="md:hidden bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-[#4B4BF7] rounded-lg flex items-center justify-center">
              <span className="text-white font-black text-sm">₹</span>
            </div>
            <span className="font-bold text-gray-900">LoanApp</span>
          </div>
          <button onClick={handleLogout} className="p-2 text-red-500">
            <LogOut size={20} />
          </button>
        </header>

        {/* Mobile bottom nav */}
        <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20 flex">
          {navItems.slice(0, 5).map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link key={href} href={href}
                className={cn("flex-1 flex flex-col items-center gap-1 py-2 text-xs",
                  active ? "text-[#4B4BF7]" : "text-gray-400")}>
                <Icon size={20} />
                <span className="truncate w-full text-center">{label.split(" ")[0]}</span>
              </Link>
            );
          })}
        </nav>

        <div className="pb-20 md:pb-0">{children}</div>
      </main>
    </div>
  );
}
