import { useEffect, useMemo, useState } from "react";
import { getExpenseInsights } from "../services/expenseService";
import type { ExpenseInsights } from "../types/expense";
import DailyTrendChart from "./DailyTrendChart";
import InsightCards from "./InsightCards";
import PeriodSelector, { type InsightPeriod } from "./PeriodSelector";
import SpendingCategoryChart from "./SpendingCategoryChart";

interface FinancialInsightsProps {
  refreshKey: number;
}

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPeriodRange(period: InsightPeriod) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  if (period === "last_month") {
    const start = new Date(currentYear, currentMonth - 1, 1);
    const end = new Date(currentYear, currentMonth, 0);

    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
    };
  }

  if (period === "last_3_months") {
    const start = new Date(currentYear, currentMonth - 2, 1);
    const end = new Date(currentYear, currentMonth + 1, 0);

    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
    };
  }

  if (period === "last_6_months") {
    const start = new Date(currentYear, currentMonth - 5, 1);
    const end = new Date(currentYear, currentMonth + 1, 0);

    return {
      startDate: formatDateInput(start),
      endDate: formatDateInput(end),
    };
  }

  if (period === "this_year") {
    return {
      startDate: formatDateInput(new Date(currentYear, 0, 1)),
      endDate: formatDateInput(new Date(currentYear, 11, 31)),
    };
  }

  return {
    startDate: formatDateInput(new Date(currentYear, currentMonth, 1)),
    endDate: formatDateInput(new Date(currentYear, currentMonth + 1, 0)),
  };
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

function getDateRangeError(startDate: string, endDate: string) {
  if (!startDate || !endDate) {
    return "Choose both a start date and an end date.";
  }

  if (startDate > endDate) {
    return "Start date must be before or equal to end date.";
  }

  return "";
}

function FinancialInsights({ refreshKey }: FinancialInsightsProps) {
  const defaultRange = useMemo(() => getPeriodRange("this_month"), []);
  const [period, setPeriod] = useState<InsightPeriod>("this_month");
  const [customStartDate, setCustomStartDate] = useState(
    defaultRange.startDate
  );
  const [customEndDate, setCustomEndDate] = useState(defaultRange.endDate);
  const [insights, setInsights] = useState<ExpenseInsights | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [requestError, setRequestError] = useState("");

  const selectedRange =
    period === "custom"
      ? {
          startDate: customStartDate,
          endDate: customEndDate,
        }
      : getPeriodRange(period);
  const dateRangeError = getDateRangeError(
    selectedRange.startDate,
    selectedRange.endDate
  );
  const error = dateRangeError || requestError;
  const displayedInsights = dateRangeError ? null : insights;
  const showLoading = isLoading && !dateRangeError;

  useEffect(() => {
    if (dateRangeError) {
      return;
    }

    let isCurrentRequest = true;

    void getExpenseInsights(selectedRange.startDate, selectedRange.endDate)
      .then((insightData) => {
        if (!isCurrentRequest) {
          return;
        }

        setInsights(insightData);
        setRequestError("");
      })
      .catch((requestError) => {
        if (!isCurrentRequest) {
          return;
        }

        setInsights(null);
        setRequestError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load financial insights"
        );
      })
      .finally(() => {
        if (!isCurrentRequest) {
          return;
        }

        setIsLoading(false);
      });

    return () => {
      isCurrentRequest = false;
    };
  }, [
    dateRangeError,
    refreshKey,
    selectedRange.endDate,
    selectedRange.startDate,
  ]);

  function handlePeriodChange(nextPeriod: InsightPeriod) {
    setRequestError("");
    const nextRange =
      nextPeriod === "custom"
        ? { startDate: customStartDate, endDate: customEndDate }
        : getPeriodRange(nextPeriod);

    setIsLoading(!getDateRangeError(nextRange.startDate, nextRange.endDate));
    setPeriod(nextPeriod);
  }

  function handleStartDateChange(nextStartDate: string) {
    setRequestError("");
    setIsLoading(!getDateRangeError(nextStartDate, customEndDate));
    setCustomStartDate(nextStartDate);
  }

  function handleEndDateChange(nextEndDate: string) {
    setRequestError("");
    setIsLoading(!getDateRangeError(customStartDate, nextEndDate));
    setCustomEndDate(nextEndDate);
  }

  return (
    <section className="insights-section">
      <div className="insights-header">
        <div>
          <p className="eyebrow">Financial Insights</p>
          <h2>Understand your money for a selected period.</h2>
        </div>
        <PeriodSelector
          period={period}
          startDate={customStartDate}
          endDate={customEndDate}
          onPeriodChange={handlePeriodChange}
          onStartDateChange={handleStartDateChange}
          onEndDateChange={handleEndDateChange}
        />
      </div>

      {error && <div className="form-error">{error}</div>}

      {showLoading && <p className="muted">Loading insights...</p>}

      {!showLoading && displayedInsights && (
        <>
          <InsightCards insights={displayedInsights} />

          <div className="chart-grid">
            <SpendingCategoryChart data={displayedInsights.byCategory} />
            <DailyTrendChart data={displayedInsights.dailyTrend} />
          </div>

          <div className="insight-notes">
            {displayedInsights.insights.map((insight) => (
              <p key={insight}>{insight}</p>
            ))}
          </div>

          <section className="panel category-stats-panel">
            <div className="panel-header list-header">
              <div>
                <h2>Category Statistics</h2>
                <p>Spending by category for this period.</p>
              </div>
              <span>
                {displayedInsights.byCategory.length} spending categories
                {displayedInsights.totalIncome > 0 ? " + income" : ""}
              </span>
            </div>

            <div className="category-stats-list">
              {displayedInsights.totalIncome > 0 && (
                <article className="category-stats-row income-stats-row">
                  <div className="category-stats-main">
                    <div>
                      <strong>Income</strong>
                      <span>Tracked separately from spending</span>
                    </div>
                    <strong>{formatCurrency(displayedInsights.totalIncome)}</strong>
                  </div>
                </article>
              )}

              {displayedInsights.byCategory.length === 0 ? (
                <p className="muted">No spending categories in this period.</p>
              ) : (
                displayedInsights.byCategory.map((category) => {
                  const percentage =
                    displayedInsights.totalSpending > 0
                      ? (category.amount / displayedInsights.totalSpending) * 100
                      : 0;

                  return (
                    <article className="category-stats-row" key={category.category}>
                      <div className="category-stats-main">
                        <div>
                          <strong>{category.category}</strong>
                          <span>{Math.round(percentage)}% of spending</span>
                        </div>
                        <strong>{formatCurrency(category.amount)}</strong>
                      </div>
                      <div
                        className="category-stats-bar"
                        aria-label={`${category.category} ${Math.round(
                          percentage
                        )}% of spending`}
                      >
                        <span style={{ width: `${percentage}%` }} />
                      </div>
                    </article>
                  );
                })
              )}
            </div>
          </section>
        </>
      )}
    </section>
  );
}

export default FinancialInsights;
