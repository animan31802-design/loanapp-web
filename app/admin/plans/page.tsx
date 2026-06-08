"use client";
import { useEffect, useState } from "react";
import PageHeader from "@/components/shared/PageHeader";
import LoadingSpinner from "@/components/shared/LoadingSpinner";
import EmptyState from "@/components/shared/EmptyState";
import { getAllPlans, createPlan, updatePlan, deletePlan, togglePlanActive } from "@/controllers/PlanController";
import { Plan, CreatePlanInput } from "@/models/Plan";
import { LoanMode } from "@/constants/Enums";
import { toast } from "sonner";
import { Plus, Pencil, Trash2 } from "lucide-react";

const EMPTY: CreatePlanInput = { name: "", months: 10, interestRatePerHundred: 1, repaymentType: LoanMode.FLAT_EMI };

export default function PlansPage() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<CreatePlanInput>(EMPTY);
  const [saving, setSaving] = useState(false);

  const load = () => getAllPlans().then(setPlans).catch(console.error).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { toast.error("Plan name required"); return; }
    setSaving(true);
    try {
      if (editing) await updatePlan(editing.planId, form);
      else await createPlan(form);
      toast.success(editing ? "Plan updated!" : "Plan created!");
      setShowForm(false); setEditing(null); setForm(EMPTY); load();
    } catch (e: any) { toast.error(e.message || "Failed"); }
    finally { setSaving(false); }
  };

  const handleDelete = async (plan: Plan) => {
    if (!confirm(`Delete plan "${plan.name}"?`)) return;
    try { await deletePlan(plan.planId); toast.success("Deleted"); load(); }
    catch (e: any) { toast.error(e.message || "Failed"); }
  };

  const modeColors: Record<string, string> = {
    [LoanMode.FLAT_EMI]: "bg-green-100 text-green-700",
    [LoanMode.EMI]: "bg-blue-100 text-blue-700",
    [LoanMode.INTEREST_ONLY]: "bg-purple-100 text-purple-700",
  };
  const modeLabels: Record<string, string> = {
    [LoanMode.FLAT_EMI]: "Flat EMI",
    [LoanMode.EMI]: "Reducing EMI",
    [LoanMode.INTEREST_ONLY]: "Interest Only",
  };

  return (
    <div>
      <PageHeader title="Loan Plans" subtitle={`${plans.length} plans`}
        action={
          <button onClick={() => { setEditing(null); setForm(EMPTY); setShowForm(true); }}
            className="flex items-center gap-2 bg-[#4B4BF7] text-white px-4 py-2.5 rounded-xl text-sm font-semibold hover:bg-[#3b3be0]">
            <Plus size={16} /> New Plan
          </button>
        } />

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <form onSubmit={handleSave} className="bg-white rounded-2xl w-full max-w-md p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold">{editing ? "Edit Plan" : "New Plan"}</h2>
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name *</label>
              <input value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                placeholder="e.g. 10 Month Standard"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7]" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Months *</label>
                <input type="number" value={form.months} onChange={e => setForm(p => ({ ...p, months: parseInt(e.target.value)||0 }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7]" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">₹/₹100/mo *</label>
                <input type="number" step="0.25" value={form.interestRatePerHundred} onChange={e => setForm(p => ({ ...p, interestRatePerHundred: parseFloat(e.target.value)||0 }))}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7]" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Repayment Type *</label>
              <div className="grid grid-cols-3 gap-2">
                {Object.entries(modeLabels).map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setForm(p => ({ ...p, repaymentType: val as LoanMode }))}
                    className={`py-2 px-3 rounded-xl text-xs font-semibold border-2 transition-colors ${form.repaymentType === val ? "border-[#4B4BF7] bg-[#EEF2FF] text-[#4B4BF7]" : "border-gray-200 text-gray-600"}`}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-3 pt-2">
              <button type="button" onClick={() => { setShowForm(false); setEditing(null); }}
                className="flex-1 py-3 border border-gray-200 text-gray-600 font-semibold rounded-xl hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={saving}
                className="flex-1 py-3 bg-[#4B4BF7] text-white font-bold rounded-xl hover:bg-[#3b3be0] disabled:opacity-60">
                {saving ? "Saving..." : editing ? "Update" : "Create"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="px-4 md:px-6 space-y-3">
        {loading ? <LoadingSpinner /> : plans.length === 0 ? (
          <EmptyState icon="📋" title="No Plans Yet" subtitle="Create plans for members to choose" />
        ) : plans.map(plan => (
          <div key={plan.planId} className={`bg-white rounded-2xl p-4 shadow-sm ${!plan.isActive && "opacity-60"}`}>
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="font-bold text-gray-900">{plan.name}</p>
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${modeColors[plan.repaymentType] || "bg-gray-100 text-gray-600"}`}>
                  {modeLabels[plan.repaymentType] || plan.repaymentType}
                </span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={plan.isActive}
                  onChange={() => togglePlanActive(plan.planId, !plan.isActive).then(load).catch((e:any)=>toast.error(e.message))}
                  className="w-4 h-4 accent-[#4B4BF7]" />
                <span className="text-xs text-gray-500">{plan.isActive ? "Active" : "Inactive"}</span>
              </label>
            </div>
            <div className="grid grid-cols-3 gap-3 mb-3">
              {[["Duration", `${plan.months} months`], ["Interest", `₹${plan.interestRatePerHundred}/₹100/mo`], ["Status", plan.isActive?"Active":"Inactive"]].map(([l,v])=>(
                <div key={l}><p className="text-xs text-gray-400">{l}</p><p className="text-sm font-bold text-gray-900">{v}</p></div>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setEditing(plan); setForm({ name:plan.name,months:plan.months,interestRatePerHundred:plan.interestRatePerHundred,repaymentType:plan.repaymentType }); setShowForm(true); }}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-[#EEF2FF] text-[#4B4BF7] text-sm font-semibold rounded-xl hover:bg-indigo-100">
                <Pencil size={14} /> Edit
              </button>
              <button onClick={() => handleDelete(plan)}
                className="flex-1 flex items-center justify-center gap-2 py-2 bg-red-50 text-red-500 text-sm font-semibold rounded-xl hover:bg-red-100">
                <Trash2 size={14} /> Delete
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
