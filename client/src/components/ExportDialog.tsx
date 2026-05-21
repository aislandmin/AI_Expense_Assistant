import { useState } from "react";
import type { ExportExpensesParams } from "../types/expense";

interface ExportDialogProps {
  isOpen: boolean;
  isExporting: boolean;
  onClose: () => void;
  onExport: (params: ExportExpensesParams) => Promise<void>;
}

type ExportPeriod =
  | "all"
  | "this-month"
  | "last-month"
  | "last-3-months"
  | "last-6-months"
  | "this-year"
  | "custom";

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getPresetDateRange(period: ExportPeriod) {
  const today = new Date();
  const currentYear = today.getFullYear();
  const currentMonth = today.getMonth();

  if (period === "this-month") {
    return {
      startDate: toDateInputValue(new Date(currentYear, currentMonth, 1)),
      endDate: toDateInputValue(new Date(currentYear, currentMonth + 1, 0)),
    };
  }

  if (period === "last-month") {
    const startDate = new Date(currentYear, currentMonth - 1, 1);
    const endDate = new Date(currentYear, currentMonth, 0);

    return {
      startDate: toDateInputValue(startDate),
      endDate: toDateInputValue(endDate),
    };
  }

  if (period === "last-3-months") {
    return {
      startDate: toDateInputValue(new Date(currentYear, currentMonth - 2, 1)),
      endDate: toDateInputValue(new Date(currentYear, currentMonth + 1, 0)),
    };
  }

  if (period === "last-6-months") {
    return {
      startDate: toDateInputValue(new Date(currentYear, currentMonth - 5, 1)),
      endDate: toDateInputValue(new Date(currentYear, currentMonth + 1, 0)),
    };
  }

  if (period === "this-year") {
    return {
      startDate: toDateInputValue(new Date(currentYear, 0, 1)),
      endDate: toDateInputValue(new Date(currentYear, 11, 31)),
    };
  }

  return null;
}

function ExportDialog({
  isOpen,
  isExporting,
  onClose,
  onExport,
}: ExportDialogProps) {
  const [period, setPeriod] = useState<ExportPeriod>("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [error, setError] = useState("");

  if (!isOpen) {
    return null;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (period === "custom") {
      if (!startDate || !endDate) {
        setError("Choose a start and end date.");
        return;
      }

      if (startDate > endDate) {
        setError("Start date must be before or equal to end date.");
        return;
      }

      await onExport({ startDate, endDate });
      return;
    }

    const presetDateRange = getPresetDateRange(period);

    if (presetDateRange) {
      await onExport(presetDateRange);
      return;
    }

    await onExport({});
  }

  return (
    <div className="dialog-backdrop" role="presentation">
      <section
        className="export-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="export-dialog-title"
      >
        <div className="panel-header">
          <h2 id="export-dialog-title">Export CSV</h2>
          <p>Choose which entries to include.</p>
        </div>

        <form className="export-form" onSubmit={handleSubmit}>
          <label>
            Period
            <select
              value={period}
              onChange={(event) => setPeriod(event.target.value as ExportPeriod)}
            >
              <option value="all">All entries</option>
              <option value="this-month">This month</option>
              <option value="last-month">Last month</option>
              <option value="last-3-months">Last 3 months</option>
              <option value="last-6-months">Last 6 months</option>
              <option value="this-year">This year</option>
              <option value="custom">Custom date range</option>
            </select>
          </label>

          {period === "custom" && (
            <div className="export-form-grid">
              <label>
                Start Date
                <input
                  type="date"
                  value={startDate}
                  onChange={(event) => setStartDate(event.target.value)}
                />
              </label>
              <label>
                End Date
                <input
                  type="date"
                  value={endDate}
                  onChange={(event) => setEndDate(event.target.value)}
                />
              </label>
            </div>
          )}

          {error && <p className="form-error">{error}</p>}

          <div className="dialog-actions">
            <button
              className="secondary-button"
              type="button"
              onClick={onClose}
              disabled={isExporting}
            >
              Cancel
            </button>
            <button className="primary-button" type="submit" disabled={isExporting}>
              {isExporting ? "Exporting..." : "Download CSV"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}

export default ExportDialog;
