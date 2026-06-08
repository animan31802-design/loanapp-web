import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "sonner";

const geist = Geist({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "LoanApp",
  description: "Loan Management System",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "LoanApp" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#4B4BF7",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={geist.className}>
        <AuthProvider>
          {children}
          <Toaster position="top-center" richColors />
        </AuthProvider>
      </body>
    </html>
  );
}
