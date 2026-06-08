"use client";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { logout } from "@/controllers/AuthController";
import { UserRole } from "@/constants/Enums";
import { toast } from "sonner";
import { LayoutDashboard, FileText, Wallet, PieChart, Bell, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/member/dashboard", label: "Home", icon: LayoutDashboard },
  { href: "/member/loans", label: "Loans", icon: FileText },
  { href: "/member/wallet", label: "Wallet", icon: Wallet },
  { href: "/member/contributions", label: "My Share", icon: PieChart },
  { href: "/member/notifications", label: "Alerts", icon: Bell },
];

export default function MemberLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userProfile, loading } = useAuth();

  useEffect(() => {
    if (!loading && (!userProfile || userProfile.role !== UserRole.MEMBER)) {
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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-[#4B4BF7] text-white px-4 py-4 flex items-center justify-between sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/20 rounded-full flex items-center justify-center">
            <span className="text-white font-bold text-sm">{userProfile?.name?.[0]?.toUpperCase()}</span>
          </div>
          <div>
            <p className="font-semibold text-sm">Hi, {userProfile?.name?.split(" ")[0]}</p>
            <p className="text-xs text-indigo-200">Member</p>
          </div>
        </div>
        <button onClick={handleLogout} className="p-2 text-white/70 hover:text-white">
          <LogOut size={20} />
        </button>
      </header>

      {/* Content */}
      <main className="pb-20">{children}</main>

      {/* Bottom nav */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 z-20 flex safe-bottom">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || (pathname.startsWith(href + "/") && href !== "/member/loans") ||
            (href === "/member/loans" && (pathname === "/member/loans" || pathname.startsWith("/member/loans/")));
          return (
            <Link key={href} href={href}
              className={cn("flex-1 flex flex-col items-center gap-1 py-3 text-xs transition-colors",
                active ? "text-[#4B4BF7]" : "text-gray-400 hover:text-gray-600")}>
              <Icon size={22} strokeWidth={active ? 2.5 : 1.8} />
              <span className="font-medium">{label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
