interface EmptyStateProps { icon?: string; title: string; subtitle?: string; action?: React.ReactNode; }
export default function EmptyState({ icon = "📭", title, subtitle, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <span className="text-5xl mb-4">{icon}</span>
      <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
      {subtitle && <p className="text-sm text-gray-500 mt-1 max-w-xs">{subtitle}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
