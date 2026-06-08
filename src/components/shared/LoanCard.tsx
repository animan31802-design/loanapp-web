import { Loan } from "@/models/Loan";
import { formatCurrency, formatDate } from "@/utils/Formatters";
import { LoanStatus } from "@/constants/Enums";
import { cn } from "@/lib/utils";

const statusStyles: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  ACTIVE: "bg-blue-100 text-blue-700",
  CLOSED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  FUNDED: "bg-purple-100 text-purple-700",
};

interface LoanCardProps { loan: Loan; onClick?: () => void; }
export default function LoanCard({ loan, onClick }: LoanCardProps) {
  return (
    <div onClick={onClick} className={cn("bg-white rounded-2xl p-4 shadow-sm border border-gray-100", onClick && "cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99]")}>
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex-1 min-w-0">
          {loan.loanNumber && <p className="text-xs text-[#4B4BF7] font-bold mb-1">{loan.loanNumber}</p>}
          <p className="font-bold text-gray-900 truncate">{loan.customerName || "—"}</p>
          <p className="text-xs text-gray-400 mt-0.5">Finder: {loan.finderMemberName}</p>
        </div>
        <span className={cn("text-xs font-bold px-2 py-1 rounded-full whitespace-nowrap", statusStyles[loan.status] || "bg-gray-100 text-gray-600")}>
          {loan.status}
        </span>
      </div>
      <div className="flex items-center justify-between mt-3">
        <p className="text-xl font-black text-[#4B4BF7]">{formatCurrency(loan.requestedAmt)}</p>
        <p className="text-xs text-gray-400">{formatDate(loan.createdAt)}</p>
      </div>
      {loan.planName && <p className="text-xs text-gray-500 mt-1">{loan.planName} · {loan.tenureMonths} months</p>}
    </div>
  );
}
