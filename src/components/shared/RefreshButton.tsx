"use client";
import { RefreshCw } from "lucide-react";
import { useState } from "react";

interface RefreshButtonProps {
  onRefresh: () => Promise<void>;
}

export default function RefreshButton({ onRefresh }: RefreshButtonProps) {
  const [spinning, setSpinning] = useState(false);

  const handleClick = async () => {
    setSpinning(true);
    try { await onRefresh(); } finally { setSpinning(false); }
  };

  return (
    <button
      onClick={handleClick}
      disabled={spinning}
      aria-label="Refresh"
      className="p-2 hover:bg-gray-100 rounded-xl transition-colors disabled:opacity-50"
    >
      <RefreshCw size={18} className={spinning ? "animate-spin text-[#4B4BF7]" : "text-gray-500"} />
    </button>
  );
}
