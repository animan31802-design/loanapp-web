import { queryDocs, COLLECTIONS } from "@/services/FirebaseService";
import { UserRole } from "@/constants/Enums";

export const getAllMembers = async (): Promise<any[]> => {
  const data = await queryDocs(COLLECTIONS.USERS, [
    { field: "role", op: "==", value: UserRole.MEMBER },
  ]);
  return data;
};

export const getMemberById = async (uid: string): Promise<any | null> => {
  const { getDoc } = await import("@/services/FirebaseService");
  return getDoc(COLLECTIONS.USERS, uid);
};
