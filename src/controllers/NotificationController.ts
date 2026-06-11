import { queryDocs, addDoc, updateDoc, COLLECTIONS } from "@/services/FirebaseService";
import { serverTimestamp } from "@/services/FirebaseService";
import { getAllMembers } from "@/controllers/TeamController";

const sendNotification = async (userId: string, title: string, body: string): Promise<void> => {
  try {
    await addDoc(COLLECTIONS.NOTIFICATIONS, {
      userId: String(userId),
      title: String(title),
      body: String(body),
      read: false,
      createdAt: serverTimestamp(),
    });
  } catch (e) { console.log("sendNotification error:", e); }
};

const sendNotificationToAll = async (title: string, body: string): Promise<void> => {
  try {
    const members = await getAllMembers();
    await Promise.all(members.map((m: any) => sendNotification(m.uid, title, body)));
  } catch (e) { console.log("sendNotificationToAll error:", e); }
};

export const getNotificationsByUser = async (userId: string): Promise<any[]> => {
  try {
    return await queryDocs(
      COLLECTIONS.NOTIFICATIONS,
      [{ field: "userId", op: "==", value: userId }],
      "createdAt",
      "desc"
    );
  } catch { return []; }
};

export const markAllRead = async (userId: string): Promise<void> => {
  try {
    const unread = await queryDocs(COLLECTIONS.NOTIFICATIONS, [
      { field: "userId", op: "==", value: userId },
      { field: "read", op: "==", value: false },
    ]);
    await Promise.all(unread.map((n: any) => updateDoc(COLLECTIONS.NOTIFICATIONS, n.id, { read: true })));
  } catch (e) { console.log("markAllRead error:", e); }
};

export const notifyNewLoanRequest = async (
  adminId: string, finderName: string, customerName: string, amount: number, totalAvailable?: number
): Promise<void> => {
  const shortfall = totalAvailable !== undefined ? Math.max(0, amount - totalAvailable) : 0;
  await sendNotification(adminId, "📋 New Loan Request",
    `${finderName} created a loan of ₹${amount} for ${customerName}. Pool: ₹${totalAvailable?.toFixed(2) || "?"}${shortfall > 0 ? `. Need ₹${shortfall.toFixed(2)} more.` : " — Sufficient."}`);
  if (shortfall > 0) {
    await sendNotificationToAll("⚠️ New Loan — Funds Needed",
      `New loan: ₹${amount} for ${customerName}. Pool has ₹${totalAvailable?.toFixed(2)}. Need ₹${shortfall.toFixed(2)} more. Please add investment.`);
  } else {
    await sendNotificationToAll("💰 New Loan Request",
      `${finderName} submitted a loan of ₹${amount} for ${customerName}. Awaiting admin approval.`);
  }
};

export const notifyInsufficientFunds = async (
  loanNumber: string, customerName: string, loanAmount: number, totalAvailable: number, shortfall: number
): Promise<void> => {
  await sendNotificationToAll("⚠️ Add Investment Needed",
    `Loan ${loanNumber} for ${customerName} needs ₹${loanAmount.toFixed(2)}. Available: ₹${totalAvailable.toFixed(2)}. Shortfall: ₹${shortfall.toFixed(2)}.`);
};

export const notifyLoanApproved = async (memberId: string, customerName: string, amount: number): Promise<void> => {
  await sendNotification(memberId, "🎉 Loan Approved", `Loan for ${customerName} (₹${amount}) has been approved. Disbursement scheduled.`);
};

export const notifyLoanRejected = async (memberId: string, customerName: string): Promise<void> => {
  await sendNotification(memberId, "❌ Loan Rejected", `Loan request for ${customerName} has been rejected.`);
};

export const notifyLoanFunded = async (adminId: string, customerName: string, amount: number): Promise<void> => {
  await sendNotification(adminId, "✅ Loan Fully Funded", `Loan for ${customerName} (₹${amount}) is ready for approval.`);
};

export const notifyPaymentVerified = async (memberIds: string[], loanId: string, emiNumber: number, amount: number): Promise<void> => {
  await Promise.all(memberIds.map(id =>
    sendNotification(id, "💸 Wallet Updated", `EMI #${emiNumber} of ₹${amount} verified. Your wallet has been updated.`)
  ));
};
