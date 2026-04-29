import { BottomNav } from "@/components/customer/BottomNav";

export default function CustomerLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-bone">
      <main className="flex-1 max-w-md w-full mx-auto pb-4">{children}</main>
      <BottomNav />
    </div>
  );
}
