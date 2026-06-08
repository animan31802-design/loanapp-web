import {
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  onAuthStateChanged as firebaseOnAuthStateChanged,
  User as FirebaseUser,
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { getDoc, setDoc, queryDocs, COLLECTIONS, serverTimestamp } from "@/services/FirebaseService";
import { User } from "@/models/User";
import { UserRole } from "@/constants/Enums";

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
  // For web, admin creates members via Firebase Admin SDK or Cloud Functions
  // For now, use client-side creation (requires admin to be logged in)
  const { createUserWithEmailAndPassword } = await import("firebase/auth");
  const { auth: firebaseAuth } = await import("@/lib/firebase");
  
  const cred = await createUserWithEmailAndPassword(firebaseAuth, email, password);
  const uid = cred.user.uid;

  await setDoc(COLLECTIONS.USERS, uid, {
    uid,
    name: String(name),
    phone: String(phone),
    email: String(email),
    role: UserRole.MEMBER,
    teamId: teamId || null,
    createdAt: serverTimestamp(),
  });

  return uid;
};
