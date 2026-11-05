import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine
} from 'recharts';

export interface SentimentDataPoint {
  turn: string; // e.g. "Turn 1", "Turn 2"
  label: string; // e.g. "Her Opener"
  sender: 'her' | 'you' | 'wingman';
  text: string;
  positivity: number; // 0 to 100
  chemistryScore: number; // 0 to 100
  vibe: string;
  insight: string;
}

interface SentimentChartProps {
  data: SentimentDataPoint[];
  activeVibe?: string;
}

const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const d: SentimentDataPoint = payload[0].payload;
    const isHer = d.sender === 'her';
    const isWingman = d.sender === 'wingman';

    return (
      <div className="bg-zinc-950/95 border border-zinc-800 rounded-xl p-3.5 shadow-2xl backdrop-blur-md max-w-xs text-xs z-50">
        <div className="flex items-center justify-between gap-2 mb-2 pb-2 border-b border-zinc-800/80">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                isHer
                  ? 'bg-pink-500 shadow-sm shadow-pink-500/50'
                  : isWingman
                  ? 'bg-orange-500 shadow-sm shadow-orange-500/50'
                  : 'bg-emerald-500 shadow-sm shadow-emerald-500/50'
              }`}
            />
            <span className="font-semibold text-white">
              {isHer ? 'Her Message' : isWingman ? '⚡ Wingman Reply' : 'Your Message'}
            </span>
          </div>
          <span className="px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-[10px] text-zinc-300 font-mono">
            {d.turn}
          </span>
        </div>

        <p className="text-zinc-300 italic mb-2.5 leading-relaxed bg-zinc-900/60 p-2 rounded-lg border border-zinc-800/50">
          "{d.text}"
        </p>

        <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px]">
          <div className="bg-zinc-900/40 p-1.5 rounded border border-zinc-800/40">
            <span className="text-zinc-500 block text-[10px]">Positivity Score</span>
            <span
              className={`font-bold text-sm ${
                d.positivity >= 75
                  ? 'text-emerald-400'
                  : d.positivity >= 50
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {d.positivity}%
            </span>
          </div>
          <div className="bg-zinc-900/40 p-1.5 rounded border border-zinc-800/40">
            <span className="text-zinc-500 block text-[10px]">Vibe Calibrated</span>
            <span className="text-orange-400 font-semibold">{d.vibe}</span>
          </div>
        </div>

        {d.insight && (
          <div className="mt-2.5 text-[10px] text-zinc-300 bg-orange-950/20 border border-orange-500/20 rounded-lg p-2 leading-relaxed">
            <span className="text-orange-400 font-semibold mr-1">Coaching Note:</span>
            {d.insight}
          </div>
        )}
      </div>
    );
  }
  return null;
};

export const SentimentChartComponent: React.FC<SentimentChartProps> = ({ data }) => {
  return (
    <div style={{ width: '100%', height: 260, minHeight: 260 }} className="w-full select-none">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={data}
          margin={{ top: 15, right: 15, left: -20, bottom: 5 }}
        >
          <defs>
            <linearGradient id="sentimentGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#ea580c" stopOpacity={0.5} />
              <stop offset="50%" stopColor="#f97316" stopOpacity={0.2} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0.0} />
            </linearGradient>
          </defs>

          <CartesianGrid strokeDasharray="3 3" stroke="#27272a" vertical={false} />

          <XAxis
            dataKey="turn"
            stroke="#71717a"
            fontSize={11}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
          />
          <YAxis
            stroke="#71717a"
            fontSize={10}
            tickLine={false}
            axisLine={{ stroke: '#27272a' }}
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            tickFormatter={(val) => `${val}%`}
          />

          <Tooltip content={<CustomTooltip />} />

          {/* Neutral Baseline (50%) */}
          <ReferenceLine
            y={50}
            stroke="#52525b"
            strokeDasharray="4 4"
            label={{
              value: 'Neutral Zone (50%)',
              fill: '#a1a1aa',
              fontSize: 9,
              position: 'insideTopLeft'
            }}
          />

          {/* High Chemistry Spike Threshold (75%) */}
          <ReferenceLine
            y={75}
            stroke="#10b981"
            strokeDasharray="3 3"
            strokeOpacity={0.7}
            label={{
              value: 'High Chemistry ✨ (75%+)',
              fill: '#34d399',
              fontSize: 9,
              position: 'insideTopRight'
            }}
          />

          {/* Positivity Area Curve */}
          <Area
            type="monotone"
            dataKey="positivity"
            name="Positivity"
            stroke="#f97316"
            strokeWidth={3}
            fillOpacity={1}
            fill="url(#sentimentGradient)"
            dot={{ r: 5, fill: '#f97316', stroke: '#09090b', strokeWidth: 2 }}
            activeDot={{ r: 7, fill: '#ffedd5', stroke: '#ea580c', strokeWidth: 2 }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};

// Root cache for cleanup
const rootsMap = new WeakMap<HTMLElement, Root>();

export function mountSentimentChart(
  container: HTMLElement,
  data: SentimentDataPoint[],
  activeVibe?: string
): void {
  let root = rootsMap.get(container);
  if (!root) {
    root = createRoot(container);
    rootsMap.set(container, root);
  }

  root.render(
    <SentimentChartComponent data={data} activeVibe={activeVibe} />
  );
}

export function unmountSentimentChart(container: HTMLElement): void {
  const root = rootsMap.get(container);
  if (root) {
    try {
      root.unmount();
    } catch {
      // ignore
    }
    rootsMap.delete(container);
  }
}
