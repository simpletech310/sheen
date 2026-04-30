import Link from "next/link";
import { Eyebrow } from "@/components/brand/Eyebrow";
import { SupportForm } from "./SupportForm";

export const dynamic = "force-dynamic";

const faq = [
  {
    q: "How do I get more jobs?",
    a: "Stay verified, keep your hours wide, and grow your radius. Customers also book direct via your @handle — share /r/YOURHANDLE and you'll skip the queue entirely.",
  },
  {
    q: "When do I get paid?",
    a: "Same-day standard payout for completed jobs. Tips are 100% yours and hit your Stripe account same-day. Instant payouts cost 1.5%.",
  },
  {
    q: "What if a customer is a no-show?",
    a: "Hit the issue flag on the navigation page. We auto-charge the customer the no-show fee and you get paid for showing up.",
  },
  {
    q: "How do I dispute a penalty?",
    a: "Email hello@sheen.co with the booking ID. Disputes are reviewed within 48 hours. Pending fees pause withholding until the review lands.",
  },
  {
    q: "What equipment do I need?",
    a: "Pressure washer (min 1.6 GPM), foam cannon, two-bucket setup, microfiber towels, clay bar, wax, leather conditioner, $1M GL insurance.",
  },
  {
    q: "How do I take time off?",
    a: "Schedule → block-out dates. Add the date(s), save, and jobs scheduled for those days won't hit your queue.",
  },
  {
    q: "How do I get verified?",
    a: "Three steps on /pro/verify: connect Stripe, upload insurance, submit for background check. Admin approves within 48 hours.",
  },
  {
    q: "How do I unlock big-rig jobs?",
    a: "Profile → Big rig service → toggle on. You confirm you have long hoses, foam cannon, ladders, and high-flow pumps. Jobs pay 2–6× a regular auto wash.",
  },
];

export default function ProHelpPage() {
  return (
    <div className="px-5 pt-10 pb-8">
      <Link href="/pro" className="text-bone/60 text-sm">
        ← Home
      </Link>
      <Eyebrow className="!text-bone/60 mt-4" prefix={null}>
        Help
      </Eyebrow>
      <h1 className="display text-3xl mt-3 mb-2">SUPPORT</h1>
      <div className="h-[3px] w-16 bg-gradient-to-r from-royal to-sol mb-6" />

      <Eyebrow className="!text-bone/60" prefix={null}>
        Pros ask
      </Eyebrow>
      <div className="mt-3 mb-8 space-y-2">
        {faq.map((f) => (
          <details key={f.q} className="bg-white/5 p-4 group">
            <summary className="text-sm font-bold cursor-pointer flex justify-between items-center">
              <span>{f.q}</span>
              <span className="text-sol ml-3 group-open:rotate-45 transition">+</span>
            </summary>
            <p className="text-xs text-bone/65 mt-3 leading-relaxed">{f.a}</p>
          </details>
        ))}
      </div>

      <Eyebrow className="!text-bone/60" prefix={null}>
        Contact support
      </Eyebrow>
      <div className="mt-3">
        <SupportForm />
      </div>
    </div>
  );
}
