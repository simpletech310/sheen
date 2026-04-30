import { Wordmark } from "@/components/brand/Wordmark";
import { Eyebrow } from "@/components/brand/Eyebrow";

const cols = [
  { h: "Services", items: ["Auto", "Home", "Commercial", "Fleet"] },
  { h: "Pros", items: ["Become a washer", "Partner program", "Earnings calculator"] },
  { h: "Trust", items: ["Insurance", "Damage guarantee", "Background checks", "Safety"] },
  { h: "Company", items: ["About", "Cities", "Press", "Contact"] },
];

export function MFooter() {
  return (
    <footer className="bg-ink text-bone px-6 md:px-14 pt-14 pb-8">
      {/* Gold horn stripe at top */}
      <div className="h-1 bg-sol -mx-6 md:-mx-14 -mt-14 mb-14" />
      <div className="max-w-screen mx-auto">
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-10">
          <div className="col-span-2">
            <Wordmark size={36} invert highlight />
            <p className="text-sm opacity-60 mt-5 max-w-[260px]">
              On-demand wash & detail. Vetted local pros. Get it sheened.
            </p>
          </div>
          {cols.map((col) => (
            <div key={col.h} className="flex flex-col gap-2.5">
              <Eyebrow className="!text-sol mb-1.5" prefix={null}>
                {col.h}
              </Eyebrow>
              {col.items.map((i) => (
                <span key={i} className="text-sm text-bone/75">
                  {i}
                </span>
              ))}
            </div>
          ))}
        </div>
        <div className="flex justify-between items-center mt-12 pt-6 border-t border-bone/10 text-xs opacity-60 font-mono">
          <span>© 2026 SHEEN INC. ALL RIGHTS RESERVED.</span>
          <span>sheen.co</span>
        </div>
      </div>
    </footer>
  );
}
