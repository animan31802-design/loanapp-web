export default function LoadingSpinner({ fullPage = false }: { fullPage?: boolean }) {
  const spinner = <div className="w-8 h-8 border-4 border-[#4B4BF7] border-t-transparent rounded-full animate-spin" />;
  if (fullPage) return <div className="min-h-[60vh] flex items-center justify-center">{spinner}</div>;
  return <div className="flex justify-center py-12">{spinner}</div>;
}
