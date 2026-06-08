"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft } from "lucide-react";
import { getActivePlans, generateLoanNumber, calculatePlanBreakdown } from "@/controllers/PlanController";
import { createLoanRequest } from "@/controllers/LoanController";
import { getSettings } from "@/controllers/SettingsController";
import { Plan, PlanBreakdown } from "@/models/Plan";
import { LoanMode } from "@/constants/Enums";
import { formatCurrency } from "@/utils/Formatters";
import { toast } from "sonner";

const MONTH_NAMES = ["January","February","March","April","May","June","July","August","September","October","November","December"];
const buildMonthOptions = () => {
  const now = new Date(); const opts = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
    opts.push({ value, label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}` });
  }
  return opts;
};

export default function NewLoanPage() {
  const router = useRouter();
  const { userProfile } = useAuth();
  const monthOptions = buildMonthOptions();

  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [amount, setAmount] = useState("");
  const [selectedMonth, setSelectedMonth] = useState(monthOptions[0].value);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [breakdown, setBreakdown] = useState<PlanBreakdown | null>(null);
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [showSchedule, setShowSchedule] = useState(false);

  useEffect(() => {
    getActivePlans().then(setPlans).catch(console.error).finally(() => setLoadingPlans(false));
  }, []);

  useEffect(() => {
    if (!selectedPlan) { setBreakdown(null); return; }
    const amt = parseFloat(amount);
    if (!isNaN(amt) && amt > 0) setBreakdown(calculatePlanBreakdown(selectedPlan, amt));
    else setBreakdown(null);
  }, [selectedPlan, amount]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) { toast.error("Customer name required"); return; }
    if (!selectedPlan) { toast.error("Select a plan"); return; }
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt <= 0) { toast.error("Enter valid amount"); return; }
    if (!userProfile) { toast.error("Not logged in"); return; }

    setSubmitting(true);
    try {
      const loanNumber = await generateLoanNumber();
      const settings = await getSettings().catch(() => ({ whatsappGroupLink: "" }));

      await createLoanRequest({
        loanNumber, customerId: customerPhone.trim() || customerName.trim(),
        customerName: customerName.trim(), customerPhone: customerPhone.trim(),
        finderMemberId: userProfile.uid, finderMemberName: userProfile.name,
        requestedAmt: amt, requestMonth: selectedMonth,
        planId: selectedPlan.planId, planName: selectedPlan.name,
        mode: selectedPlan.repaymentType,
        interestRatePerHundred: Number(selectedPlan.interestRatePerHundred),
        tenureMonths: Number(selectedPlan.months),
      });

      // Build WhatsApp message
      const msg = `🏦 *New Loan Request*\n\n📋 *Loan No:* ${loanNumber}\n👤 *Customer:* ${customerName.trim()}\n💰 *Amount:* ${formatCurrency(amt)}\n📅 *Plan:* ${selectedPlan.name} (${selectedPlan.months} months)\n🗓️ *Request Month:* ${monthOptions.find(m=>m.value===selectedMonth)?.label}\n👨‍💼 *Member:* ${userProfile.name}\n\n*Repayment Summary*\nMonthly EMI: ${formatCurrency(breakdown?.monthlyEMI||0)}\nTotal Interest: ${formatCurrency(breakdown?.totalInterest||0)}\nTotal Payable: ${formatCurrency(breakdown?.totalPayable||0)}`;

      toast.success(`Loan ${loanNumber} created!`);

      const waLink = settings?.whatsappGroupLink;
      if (waLink) {
        if (confirm("Open WhatsApp group to share loan details?")) {
          window.open(waLink, "_blank");
        }
      } else {
        const encoded = encodeURIComponent(msg);
        if (confirm("Open WhatsApp to share loan details?")) {
          window.open(`https://wa.me/?text=${encoded}`, "_blank");
        }
      }

      router.push("/member/loans");
    } catch (e: any) { toast.error(e.message || "Failed to submit"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 p-4 sticky top-0 bg-white z-10 border-b border-gray-100">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft size={20} /></button>
        <h1 className="text-lg font-bold text-gray-900">New Loan Request</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-5 pb-10">
        {/* Step 1 */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 bg-[#4B4BF7] text-white text-xs font-black rounded-full flex items-center justify-center">1</span>
            <span className="font-bold text-gray-900">Customer Details</span>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
              <input value={customerName} onChange={e=>setCustomerName(e.target.value)} placeholder="Full name"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone (optional)</label>
              <input type="tel" value={customerPhone} onChange={e=>setCustomerPhone(e.target.value)} placeholder="Mobile number"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loan Amount (₹) *</label>
              <input type="number" value={amount} onChange={e=>setAmount(e.target.value)} placeholder="e.g. 50000"
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7]" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Request Month *</label>
              <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7] bg-white">
                {monthOptions.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* Step 2 - Plan */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <span className="w-6 h-6 bg-[#4B4BF7] text-white text-xs font-black rounded-full flex items-center justify-center">2</span>
            <span className="font-bold text-gray-900">Select Plan</span>
          </div>
          {loadingPlans ? (
            <div className="bg-white rounded-2xl p-4 shadow-sm text-center text-gray-400 text-sm">Loading plans...</div>
          ) : plans.length === 0 ? (
            <div className="bg-amber-50 rounded-2xl p-4 text-amber-700 text-sm">⚠️ No active plans. Ask admin to create plans.</div>
          ) : (
            <div className="space-y-2">
              {plans.map(plan => (
                <button key={plan.planId} type="button" onClick={() => setSelectedPlan(plan)}
                  className={`w-full text-left bg-white rounded-2xl p-4 shadow-sm border-2 transition-all ${selectedPlan?.planId===plan.planId?"border-[#4B4BF7] bg-[#EEF2FF]":"border-transparent hover:border-gray-200"}`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900">{plan.name}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{plan.months} months · ₹{plan.interestRatePerHundred}/₹100/mo</p>
                    </div>
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${plan.repaymentType===LoanMode.FLAT_EMI?"bg-green-100 text-green-700":plan.repaymentType===LoanMode.INTEREST_ONLY?"bg-purple-100 text-purple-700":"bg-blue-100 text-blue-700"}`}>
                      {plan.repaymentType===LoanMode.FLAT_EMI?"Flat EMI":plan.repaymentType===LoanMode.INTEREST_ONLY?"Interest Only":"Reducing EMI"}
                    </span>
                  </div>
                  {selectedPlan?.planId===plan.planId && <span className="text-[#4B4BF7] text-xs font-bold mt-1 block">✓ Selected</span>}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Step 3 - Breakdown */}
        {breakdown && selectedPlan && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <span className="w-6 h-6 bg-[#4B4BF7] text-white text-xs font-black rounded-full flex items-center justify-center">3</span>
              <span className="font-bold text-gray-900">Review Breakdown</span>
            </div>
            <div className="bg-white rounded-2xl p-4 shadow-sm border-l-4 border-[#4B4BF7]">
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">{selectedPlan.repaymentType===LoanMode.INTEREST_ONLY?"Monthly Interest":"Monthly EMI"}</p>
                  <p className="text-xl font-black text-[#4B4BF7]">{formatCurrency(breakdown.monthlyEMI)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Total Interest</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(breakdown.totalInterest)}</p>
                </div>
                <div className="text-center">
                  <p className="text-xs text-gray-400 mb-1">Total Payable</p>
                  <p className="text-base font-bold text-gray-900">{formatCurrency(breakdown.totalPayable)}</p>
                </div>
              </div>
              <button type="button" onClick={() => setShowSchedule(!showSchedule)}
                className="w-full text-center text-sm text-[#4B4BF7] font-semibold py-2 border-t border-gray-100">
                {showSchedule ? "▲ Hide" : "▼ Show"} Month-by-Month Schedule
              </button>
              {showSchedule && (
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead><tr className="bg-[#EEF2FF] text-[#4B4BF7]">
                      {["Month","Payment","Principal","Interest","Balance"].map(h=><th key={h} className="px-2 py-2 text-right first:text-left">{h}</th>)}
                    </tr></thead>
                    <tbody>
                      {breakdown.schedule.map(row=>(
                        <tr key={row.month} className={row.month%2===0?"bg-gray-50":""}>
                          <td className="px-2 py-1.5">{row.month}</td>
                          <td className="px-2 py-1.5 text-right">₹{row.payment.toFixed(0)}</td>
                          <td className="px-2 py-1.5 text-right">₹{row.principal.toFixed(0)}</td>
                          <td className="px-2 py-1.5 text-right">₹{row.interest.toFixed(0)}</td>
                          <td className="px-2 py-1.5 text-right">₹{row.balance.toFixed(0)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        <button type="submit" disabled={submitting || !selectedPlan || !breakdown}
          className="w-full py-4 bg-[#4B4BF7] text-white font-bold rounded-2xl hover:bg-[#3b3be0] disabled:opacity-50 text-base">
          {submitting ? "Submitting..." : "Send Loan Request"}
        </button>
      </form>
    </div>
  );
}
