"use client";
import React, { createContext, useContext, useEffect, useState } from "react";
import { User as FirebaseUser } from "firebase/auth";
import { onAuthStateChanged } from "@/controllers/AuthController";
import { getCurrentUserProfile } from "@/controllers/AuthController";
import { User } from "@/models/User";
import { UserRole } from "@/constants/Enums";

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  userProfile: User | null;
  loading: boolean;
  isAdmin: boolean;
  isMember: boolean;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  userProfile: null,
  loading: true,
  isAdmin: false,
  isMember: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      if (user) {
        try {
          const profile = await getCurrentUserProfile();
          setUserProfile(profile);
        } catch {
          setUserProfile(null);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  return (
    <AuthContext.Provider value={{
      firebaseUser,
      userProfile,
      loading,
      isAdmin: userProfile?.role === UserRole.ADMIN,
      isMember: userProfile?.role === UserRole.MEMBER,
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
