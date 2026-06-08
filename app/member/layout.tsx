import MemberLayout from "@/components/layout/MemberLayout";
export default function Layout({ children }: { children: React.ReactNode }) {
  return <MemberLayout>{children}</MemberLayout>;
}
