import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { PaymentMethodsList } from "./PaymentMethodsList";

export const dynamic = "force-dynamic";

export default function PaymentMethodsPage() {
  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/app/me" className="text-sm text-smoke">← Account</Link>
      <Eyebrow className="mt-4">Payment methods</Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">Cards</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <PaymentMethodsList />

      <p className="text-xs text-smoke mt-6 leading-relaxed">
        We save the card you used at checkout for one-tap booking next
        time. Add a new card by booking a wash — Stripe attaches it
        automatically.
      </p>
    </div>
  );
}
