"use client";

import { Bar, BarChart, CartesianGrid, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export function EarningsChart({
  data,
}: {
  data: { label: string; cents: number }[];
}) {
  // Render dollars (not cents) on the chart for human-readable axes.
  const series = data.map((d) => ({ ...d, dollars: d.cents / 100 }));
  const max = Math.max(...series.map((d) => d.dollars), 0);
  // 12 weeks of x-labels won't fit on a 320px-wide phone — show every other.
  const tickFormatter = (label: string, idx: number) => (idx % 2 === 0 ? label : "");
  // Y-axis ceiling: pad above the max so the tallest bar isn't flush with
  // the chart top. If everything's $0 (fresh account), give a $50 ceiling
  // so the empty grid still looks intentional, not broken.
  const yMax = max > 0 ? Math.ceil((max * 1.15) / 25) * 25 : 50;

  return (
    <div className="w-full" style={{ height: 240 }}>
      <ResponsiveContainer>
        <BarChart data={series} margin={{ top: 10, right: 14, bottom: 6, left: 0 }} barCategoryGap="18%">
          <CartesianGrid stroke="rgba(250,250,247,0.06)" strokeDasharray="2 4" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "rgba(250,250,247,0.6)" }}
            interval={0}
            tickFormatter={tickFormatter as any}
            axisLine={{ stroke: "rgba(250,250,247,0.15)" }}
            tickLine={false}
          />
          <YAxis
            tick={{ fontSize: 10, fill: "rgba(250,250,247,0.6)" }}
            tickFormatter={(v) => `$${v}`}
            domain={[0, yMax]}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          {/* Baseline so the empty weeks read as "no earnings yet" rather than
              "chart broken". */}
          <ReferenceLine y={0} stroke="rgba(250,250,247,0.25)" />
          <Tooltip
            cursor={{ fill: "rgba(255,163,0,0.15)" }}
            contentStyle={{
              background: "#0A0A0A",
              color: "#FAFAF7",
              border: "1px solid rgba(255,163,0,0.4)",
              fontSize: 12,
            }}
            formatter={(v: any) => [`$${Number(v).toFixed(2)}`, "Net"]}
          />
          {/* Min bar height of 2px so even $0 weeks show a faint marker —
              keeps the visual rhythm uniform across all 12 columns. */}
          <Bar dataKey="dollars" fill="#FFA300" radius={[2, 2, 0, 0]} minPointSize={2} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
