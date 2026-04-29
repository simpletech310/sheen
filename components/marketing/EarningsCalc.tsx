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
    <div className="bg-ink text-bone p-8 md:p-10 rounded-md">
      <div className="font-mono text-[11px] text-bone/60 uppercase tracking-eyebrow mb-5">
        ── Live earnings calculator
      </div>
      <div className="grid grid-cols-2 gap-6">
        <label className="block">
          <span className="text-xs text-bone/70">Jobs per week</span>
          <input
            type="range"
            min={5}
            max={40}
            value={jobs}
            onChange={(e) => setJobs(Number(e.target.value))}
            className="w-full mt-3 accent-cobalt"
          />
          <div className="display tabular text-3xl mt-2">{jobs}</div>
        </label>
        <label className="block">
          <span className="text-xs text-bone/70">Avg ticket ($)</span>
          <input
            type="range"
            min={35}
            max={450}
            step={5}
            value={avg}
            onChange={(e) => setAvg(Number(e.target.value))}
            className="w-full mt-3 accent-cobalt"
          />
          <div className="display tabular text-3xl mt-2">${avg}</div>
        </label>
      </div>
      <div className="mt-8 pt-6 border-t border-bone/15 grid grid-cols-2 md:grid-cols-4 gap-4 text-center md:text-left">
        <div>
          <div className="text-[11px] uppercase opacity-60 font-mono">Gross</div>
          <div className="display tabular text-2xl mt-1">${gross.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase opacity-60 font-mono">22% commission</div>
          <div className="display tabular text-2xl mt-1 text-bone/60">−${commission.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase opacity-60 font-mono">Tips (~18%)</div>
          <div className="display tabular text-2xl mt-1">+${tips.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-[11px] uppercase opacity-60 font-mono">Take home / wk</div>
          <div className="display tabular text-2xl mt-1 text-cobalt">${net.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
}
