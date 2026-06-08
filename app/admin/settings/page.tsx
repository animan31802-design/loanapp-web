"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import { getSettings, saveSettings } from "@/controllers/SettingsController";
import { toast } from "sonner";

export default function SettingsPage() {
  const [whatsapp, setWhatsapp] = useState("");
  const [minInv, setMinInv] = useState("50");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getSettings().then(s => { setWhatsapp(s.whatsappGroupLink||""); setMinInv(String(s.minInvestmentAmount||50)); }).finally(()=>setLoading(false));
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const min = parseFloat(minInv);
    if (isNaN(min)||min<1) { toast.error("Min investment must be at least ₹1"); return; }
    setSaving(true);
    try { await saveSettings({ whatsappGroupLink: whatsapp.trim(), minInvestmentAmount: min }); toast.success("Settings saved!"); }
    catch (e: any) { toast.error(e.message||"Failed"); }
    finally { setSaving(false); }
  };

  if (loading) return <><PageHeader title="Settings" /><LoadingSpinner /></>;

  return (
    <div>
      <PageHeader title="App Settings" />
      <form onSubmit={handleSave} className="px-4 md:px-6 space-y-4 pb-8">
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-1">Investment Settings</h2>
          <p className="text-xs text-gray-500 mb-4">Minimum amount members must invest each month.</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Monthly Investment (₹)</label>
          <input type="number" value={minInv} onChange={e=>setMinInv(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7]" />
        </div>
        <div className="bg-white rounded-2xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-900 mb-1">WhatsApp Group</h2>
          <p className="text-xs text-gray-500 mb-4">Loan request notifications will link to this group.</p>
          <label className="block text-sm font-medium text-gray-700 mb-1">Group Invite Link</label>
          <input value={whatsapp} onChange={e=>setWhatsapp(e.target.value)} placeholder="https://chat.whatsapp.com/..."
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7]" />
          <p className="text-xs text-[#4B4BF7] mt-2">💡 Open WhatsApp group → Info → Invite via link → Copy</p>
        </div>
        <button type="submit" disabled={saving}
          className="w-full py-3 bg-[#4B4BF7] text-white font-bold rounded-xl hover:bg-[#3b3be0] disabled:opacity-60">
          {saving ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}
