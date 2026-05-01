"use client";

import { useState } from "react";

export function EarningsCalc() {
  const [jobs, setJobs] = useState(22);
  const [avg, setAvg] = useState(60);

  const gross = jobs * avg;
  const commission = Math.round(gross * 0.22);
  const tips = Math.round(gross * 0.18);
  const net = gross - commission + tips;
  const yearly = net * 52;

  return (
    <div className="bg-bone text-ink p-8 md:p-10 border border-bone/20 relative">
      <div className="absolute top-0 left-0 right-0 h-1 bg-sol" />
      <div className="font-mono text-[11px] text-smoke uppercase tracking-eyebrow mb-5">
        ── Live earnings calculator
      </div>
      <div className="grid grid-cols-2 gap-6">
        <label className="block">
          <span className="text-xs text-smoke uppercase font-bold tracking-wide">Jobs per week</span>
          <input
            type="range"
            min={5}
            max={40}
            value={jobs}
            onChange={(e) => setJobs(Number(e.target.value))}
            className="w-full mt-3 accent-royal"
          />
          <div className="display tabular text-4xl mt-2">{jobs}</div>
        </label>
        <label className="block">
          <span className="text-xs text-smoke uppercase font-bold tracking-wide">Avg ticket</span>
          <input
            type="range"
            min={24}
            max={189}
            step={1}
            value={avg}
            onChange={(e) => setAvg(Number(e.target.value))}
            className="w-full mt-3 accent-royal"
          />
          <div className="display tabular text-4xl mt-2">${avg}</div>
        </label>
      </div>
      <div className="mt-8 pt-6 border-t border-mist grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
        <div>
          <div className="text-[10px] uppercase text-smoke font-mono">Gross</div>
          <div className="display tabular text-2xl mt-1">${gross.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-smoke font-mono">Sheen take · 22%</div>
          <div className="display tabular text-2xl mt-1 text-smoke">−${commission.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-smoke font-mono">Tips · ~18%</div>
          <div className="display tabular text-2xl mt-1">+${tips.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-smoke font-mono">You keep / wk</div>
          <div className="display tabular text-2xl mt-1 text-royal">${net.toLocaleString()}</div>
        </div>
      </div>
      <div className="mt-4 pt-4 border-t border-mist flex justify-between items-baseline">
        <span className="font-mono text-[10px] uppercase tracking-wider text-smoke">
          Annualised · 52 weeks
        </span>
        <span className="display tabular text-xl text-royal">${yearly.toLocaleString()}</span>
      </div>
      <p className="text-[11px] text-smoke mt-3 leading-relaxed">
        Avg ticket reflects current promo pricing ($24 Express → $189 Showroom). Drop to 18% take on every
        repeat customer — top-tier pros keep 88%.
      </p>
    </div>
  );
}
