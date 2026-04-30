"use client";

import { useState } from "react";

export function EarningsCalc() {
  const [jobs, setJobs] = useState(22);
  const [avg, setAvg] = useState(85);

  const gross = jobs * avg;
  const commission = Math.round(gross * 0.22);
  const tips = Math.round(gross * 0.18);
  const net = gross - commission + tips;

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
            min={35}
            max={450}
            step={5}
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
          <div className="text-[10px] uppercase text-smoke font-mono">22% commission</div>
          <div className="display tabular text-2xl mt-1 text-smoke">−${commission.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-smoke font-mono">Tips ~18%</div>
          <div className="display tabular text-2xl mt-1">+${tips.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[10px] uppercase text-smoke font-mono">Take home / wk</div>
          <div className="display tabular text-2xl mt-1 text-royal">${net.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
