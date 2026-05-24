import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useState } from "react";
import type { ExpenseInsightCategory } from "../types/expense";

interface SpendingCategoryChartProps {
  data: ExpenseInsightCategory[];
}

type CategoryChartType = "bar" | "pie";

const categoryColors = [
  "#2563eb",
  "#16a34a",
  "#dc2626",
  "#9333ea",
  "#ea580c",
  "#0891b2",
  "#4f46e5",
  "#65a30d",
  "#be123c",
  "#0f766e",
];

const chartInitialDimension = { width: 480, height: 300 };

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function SpendingCategoryChart({ data }: SpendingCategoryChartProps) {
  const [chartType, setChartType] = useState<CategoryChartType>("bar");

  return (
    <section className="chart-panel">
      <div className="chart-header">
        <h3>Spending by category</h3>
        <div className="chart-toggle" aria-label="Choose category chart type">
          <button
            className={chartType === "bar" ? "is-active" : ""}
            type="button"
            onClick={() => setChartType("bar")}
          >
            Bar
          </button>
          <button
            className={chartType === "pie" ? "is-active" : ""}
            type="button"
            onClick={() => setChartType("pie")}
          >
            Pie
          </button>
        </div>
      </div>

      {data.length === 0 ? (
        <p className="muted">No spending entries in this period.</p>
      ) : chartType === "bar" ? (
        <div className="chart-container">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={300}
            initialDimension={chartInitialDimension}
          >
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 24, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="category"
                angle={-20}
                interval={0}
                textAnchor="end"
                tick={{ fontSize: 12 }}
              />
              <YAxis tickFormatter={formatCurrency} width={64} />
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Bar
                dataKey="amount"
                fill="#2563eb"
                isAnimationActive
                animationDuration={450}
                animationEasing="ease-out"
                radius={[6, 6, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <div className="chart-container">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={300}
            initialDimension={chartInitialDimension}
          >
            <PieChart>
              <Pie
                data={data}
                dataKey="amount"
                nameKey="category"
                cx="50%"
                cy="46%"
                outerRadius="70%"
                label={({ name, percent }) =>
                  `${String(name ?? "")} ${((percent ?? 0) * 100).toFixed(0)}%`
                }
                isAnimationActive
                animationDuration={450}
                animationEasing="ease-out"
              >
                {data.map((entry, index) => (
                  <Cell
                    fill={categoryColors[index % categoryColors.length]}
                    key={entry.category}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => formatCurrency(Number(value))} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}

export default SpendingCategoryChart;
