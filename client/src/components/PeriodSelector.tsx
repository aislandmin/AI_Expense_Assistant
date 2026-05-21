export type InsightPeriod =
  | "this_month"
  | "last_month"
  | "last_3_months"
  | "last_6_months"
  | "this_year"
  | "custom";

interface PeriodSelectorProps {
  period: InsightPeriod;
  startDate: string;
  endDate: string;
  onPeriodChange: (period: InsightPeriod) => void;
  onStartDateChange: (date: string) => void;
  onEndDateChange: (date: string) => void;
}

const periodOptions: { value: InsightPeriod; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_3_months", label: "Last 3 months" },
  { value: "last_6_months", label: "Last 6 months" },
  { value: "this_year", label: "This year" },
  { value: "custom", label: "Custom date range" },
];

function PeriodSelector({
  period,
  startDate,
  endDate,
  onPeriodChange,
  onStartDateChange,
  onEndDateChange,
}: PeriodSelectorProps) {
  return (
    <div className="period-selector">
      <label>
        Period
        <select
          value={period}
          onChange={(event) =>
            onPeriodChange(event.target.value as InsightPeriod)
          }
        >
          {periodOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {period === "custom" && (
        <div className="period-custom-fields">
          <label>
            Start date
            <input
              type="date"
              value={startDate}
              onChange={(event) => onStartDateChange(event.target.value)}
            />
          </label>
          <label>
            End date
            <input
              type="date"
              value={endDate}
              onChange={(event) => onEndDateChange(event.target.value)}
            />
          </label>
        </div>
      )}
    </div>
  );
}

export default PeriodSelector;
