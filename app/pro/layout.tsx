import { ProBottomNav } from "@/components/pro/ProBottomNav";

export default function ProLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-theme="dark" className="min-h-screen flex flex-col bg-ink text-bone">
      <main className="flex-1 max-w-md w-full mx-auto pb-4">{children}</main>
      <ProBottomNav />
    </div>
  );
}
