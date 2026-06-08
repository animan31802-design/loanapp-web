import { cn } from "@/lib/utils";
interface StatCardProps { label: string; value: string | number; icon?: string; color?: string; bg?: string; onClick?: () => void; }
export default function StatCard({ label, value, icon, color = "text-gray-900", bg = "bg-white", onClick }: StatCardProps) {
  return (
    <div onClick={onClick} className={cn("rounded-2xl p-5 shadow-sm", bg, onClick && "cursor-pointer hover:shadow-md transition-shadow")}>
      {icon && <span className="text-3xl mb-3 block">{icon}</span>}
      <p className={cn("text-3xl font-black", color)}>{value}</p>
      <p className="text-sm text-gray-500 mt-1 font-medium">{label}</p>
    </div>
  );
}
