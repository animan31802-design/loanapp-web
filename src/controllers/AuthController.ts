import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getDoc, setDoc, queryDocs, COLLECTIONS, serverTimestamp } from "@/services/FirebaseService";
import { User } from "@/models/User";

export const loginWithPhone = async (email: string, password: string): Promise<void> => {
  await signInWithEmailAndPassword(auth, email, password);
};

export const logout = async (): Promise<void> => {
  await firebaseSignOut(auth);
};

export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

export const getCurrentUserProfile = async (): Promise<User | null> => {
  const firebaseUser = auth.currentUser;
  if (!firebaseUser) return null;
  const userData = await getDoc(COLLECTIONS.USERS, firebaseUser.uid);
  return userData as User | null;
};

export const onAuthStateChanged = (callback: (user: FirebaseUser | null) => void) => {
  return firebaseOnAuthStateChanged(auth, callback);
};

export const createMemberAccount = async (
  email: string,
  password: string,
  name: string,
  phone: string,
  teamId?: string
): Promise<string> => {
  // Get the current admin's ID token to authenticate the API route.
  const currentUser = auth.currentUser;
  if (!currentUser) throw new Error("Not authenticated");
  const idToken = await currentUser.getIdToken();

  const res = await fetch("/api/admin/create-member", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${idToken}`,
    },
    body: JSON.stringify({ email, password, name, phone, teamId }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || "Failed to create member account");
  }

  return data.uid as string;
};
