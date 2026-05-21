import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useMemo } from "react";
import type { ExpenseInsightDailyTrend } from "../types/expense";

interface DailyTrendChartProps {
  data: ExpenseInsightDailyTrend[];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatShortDate(value: string) {
  const [, month, day] = value.split("-");
  return `${month}/${day}`;
}

function getReadableTicks(data: ExpenseInsightDailyTrend[]) {
  if (data.length <= 8) {
    return data.map((entry) => entry.date);
  }

  const lastIndex = data.length - 1;
  const step = Math.ceil(lastIndex / 7);
  const ticks = data
    .filter((_, index) => index % step === 0 || index === lastIndex)
    .map((entry) => entry.date);

  return Array.from(new Set(ticks));
}

function DailyTrendChart({ data }: DailyTrendChartProps) {
  const xAxisTicks = useMemo(() => getReadableTicks(data), [data]);

  return (
    <section className="chart-panel">
      <div className="chart-header">
        <h3>Daily trend</h3>
      </div>

      {data.length === 0 ? (
        <p className="muted">No entries in this period.</p>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="date"
                minTickGap={20}
                tickFormatter={formatShortDate}
                ticks={xAxisTicks}
              />
              <YAxis tickFormatter={formatCurrency} width={64} />
              <Tooltip
                formatter={(value) => formatCurrency(Number(value))}
                labelFormatter={(label) => String(label)}
              />
              <Line
                type="monotone"
                dataKey="spending"
                name="Spending"
                stroke="#dc2626"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
              <Line
                type="monotone"
                dataKey="income"
                name="Income"
                stroke="#16a34a"
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default DailyTrendChart;
