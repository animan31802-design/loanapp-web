"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createMemberAccount } from "@/controllers/AuthController";
import { toast } from "sonner";

export default function AddMemberPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", phone: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { toast.error("Fill all required fields"); return; }
    setLoading(true);
    try {
      await createMemberAccount(form.email, form.password, form.name, form.phone);
      toast.success(`Member ${form.name} added successfully!`);
      router.back();
    } catch (e: any) { toast.error(e.message || "Failed to add member"); }
    finally { setLoading(false); }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="flex items-center gap-3 p-4">
        <button onClick={() => router.back()} className="p-2 hover:bg-gray-100 rounded-xl"><ArrowLeft size={20} /></button>
        <h1 className="text-xl font-bold text-gray-900">Add Member</h1>
      </div>
      <form onSubmit={handleSubmit} className="px-4 space-y-4 pb-8">
        {[
          { label: "Full Name *", key: "name", type: "text", placeholder: "Member name" },
          { label: "Phone Number", key: "phone", type: "tel", placeholder: "10-digit number" },
          { label: "Email *", key: "email", type: "email", placeholder: "member@email.com" },
          { label: "Password *", key: "password", type: "password", placeholder: "Min 6 characters" },
        ].map(f => (
          <div key={f.key} className="bg-white rounded-2xl p-4 shadow-sm">
            <label className="block text-sm font-medium text-gray-700 mb-2">{f.label}</label>
            <input type={f.type} value={(form as any)[f.key]} onChange={e => setForm(p => ({ ...p, [f.key]: e.target.value }))}
              placeholder={f.placeholder}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#4B4BF7]" />
          </div>
        ))}
        <button type="submit" disabled={loading}
          className="w-full py-3 bg-[#4B4BF7] text-white font-bold rounded-xl hover:bg-[#3b3be0] disabled:opacity-60">
          {loading ? "Adding..." : "Add Member"}
        </button>
      </form>
    </div>
  );
}
