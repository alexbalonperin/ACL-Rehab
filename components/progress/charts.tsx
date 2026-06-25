"use client";

import type { ReactNode } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/primitives";
import { shortLabel } from "@/lib/date";

const AXIS = { fontSize: 11, fill: "currentColor" } as const;
const GRID = "rgba(128,128,128,0.15)";

export function ChartCard({
  title,
  subtitle,
  empty,
  prominent,
  children,
}: {
  title: string;
  subtitle?: string;
  empty?: boolean;
  prominent?: boolean;
  children: ReactNode;
}) {
  return (
    <Card className={prominent ? "border-brand/50 ring-1 ring-brand/20" : undefined}>
      <div className="mb-2">
        <h3 className={prominent ? "text-base font-bold text-brand" : "font-bold"}>{title}</h3>
        {subtitle && <p className="text-xs text-neutral-500">{subtitle}</p>}
      </div>
      {empty ? (
        <p className="py-8 text-center text-sm text-neutral-400">No data yet</p>
      ) : (
        <div className="h-48 w-full text-neutral-500">{children}</div>
      )}
    </Card>
  );
}

const tooltipStyle = {
  contentStyle: {
    borderRadius: 12,
    border: "1px solid rgba(128,128,128,0.3)",
    background: "rgba(20,20,20,0.9)",
    color: "#fff",
    fontSize: 12,
  },
  labelStyle: { color: "#fff" },
} as const;

export function DateLineChart({
  data,
  dataKey,
  color = "#0d9488",
  domain,
}: {
  data: { date: string; [k: string]: number | string }[];
  dataKey: string;
  color?: string;
  domain?: [number, number];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortLabel} tick={AXIS} minTickGap={24} />
        <YAxis tick={AXIS} domain={domain ?? ["auto", "auto"]} width={36} />
        <Tooltip {...tooltipStyle} labelFormatter={(l) => shortLabel(String(l))} />
        <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2.5} dot={{ r: 2 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function MultiLineChart({
  data,
  series,
  domain,
}: {
  data: { date: string; [k: string]: number | string | undefined }[];
  series: { key: string; color: string; name: string }[];
  domain?: [number | string, number | string];
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortLabel} tick={AXIS} minTickGap={24} />
        <YAxis tick={AXIS} domain={domain ?? ["auto", "auto"]} width={36} />
        <Tooltip {...tooltipStyle} labelFormatter={(l) => shortLabel(String(l))} />
        {series.map((s) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stroke={s.color}
            strokeWidth={2.5}
            dot={{ r: 2 }}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

export function WeekBarChart({
  data,
  dataKey,
  color = "#0d9488",
}: {
  data: { week: string; [k: string]: number | string }[];
  dataKey: string;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="week" tick={AXIS} minTickGap={12} />
        <YAxis tick={AXIS} allowDecimals={false} width={28} />
        <Tooltip {...tooltipStyle} />
        <Bar dataKey={dataKey} fill={color} radius={[6, 6, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DateAreaChart({
  data,
  dataKey,
  color = "#0d9488",
}: {
  data: { date: string; [k: string]: number | string }[];
  dataKey: string;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -20 }}>
        <defs>
          <linearGradient id={`grad-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.5} />
            <stop offset="100%" stopColor={color} stopOpacity={0.05} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortLabel} tick={AXIS} minTickGap={24} />
        <YAxis tick={AXIS} width={36} />
        <Tooltip {...tooltipStyle} labelFormatter={(l) => shortLabel(String(l))} />
        <Area type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} fill={`url(#grad-${dataKey})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}
