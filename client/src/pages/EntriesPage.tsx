import { useCallback, useEffect, useState } from "react";
import DeleteConfirmDialog from "../components/DeleteConfirmDialog";
import ExportDialog from "../components/ExportDialog";
import ExpenseForm from "../components/ExpenseForm";
import ExpenseList from "../components/ExpenseList";
import NaturalLanguageExpense from "../components/NaturalLanguageExpense";
import PeriodSelector, { type InsightPeriod } from "../components/PeriodSelector";
import {
  isKnownCategory,
  SUBCATEGORY_OPTIONS_BY_CATEGORY,
} from "../constants/categories";
import {
  createExpense,
  deleteExpense,
  exportExpensesCsv,
  getPaginatedExpenses,
  updateExpense,
} from "../services/expenseService";
import type {
  CreateExpenseInput,
  Expense,
  ExpenseFormValues,
  ExportExpensesParams,
  ParsedExpense,
} from "../types/expense";

const RECENT_ENTRIES_LIMIT = 5;
const HISTORY_PAGE_SIZE = 25;

function getTodayDateString() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function createInitialFormState(): ExpenseFormValues {
  return {
    amount: "",
    category: "",
    customCategory: "",
    subcategory: "",
    customSubcategory: "",
    description: "",
    merchant: "",
    date: getTodayDateString(),
  };
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
    return {
      startDate: formatDateInput(new Date(currentYear, currentMonth - 1, 1)),
      endDate: formatDateInput(new Date(currentYear, currentMonth, 0)),
    };
  }

  if (period === "last_3_months") {
    return {
      startDate: formatDateInput(new Date(currentYear, currentMonth - 2, 1)),
      endDate: formatDateInput(new Date(currentYear, currentMonth + 1, 0)),
    };
  }

  if (period === "last_6_months") {
    return {
      startDate: formatDateInput(new Date(currentYear, currentMonth - 5, 1)),
      endDate: formatDateInput(new Date(currentYear, currentMonth + 1, 0)),
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

function EntriesPage() {
  const defaultHistoryRange = getPeriodRange("this_month");
  const [recentEntries, setRecentEntries] = useState<Expense[]>([]);
  const [historyEntries, setHistoryEntries] = useState<Expense[]>([]);
  const [expenseForm, setExpenseForm] =
    useState<ExpenseFormValues>(createInitialFormState);
  const [isLoadingRecentEntries, setIsLoadingRecentEntries] = useState(true);
  const [isLoadingHistoryEntries, setIsLoadingHistoryEntries] = useState(true);
  const [isChangingHistoryPage, setIsChangingHistoryPage] =
    useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [totalHistoryEntries, setTotalHistoryEntries] = useState(0);
  const [historyPeriod, setHistoryPeriod] =
    useState<InsightPeriod>("this_month");
  const [historyStartDate, setHistoryStartDate] = useState(
    defaultHistoryRange.startDate
  );
  const [historyEndDate, setHistoryEndDate] = useState(
    defaultHistoryRange.endDate
  );
  const [loadedHistoryRange, setLoadedHistoryRange] = useState({
    startDate: "",
    endDate: "",
  });
  const [loadedHistoryPage, setLoadedHistoryPage] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHistoryEditSubmitting, setIsHistoryEditSubmitting] = useState(false);
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [historyEditExpenseId, setHistoryEditExpenseId] = useState<
    string | null
  >(null);
  const [historyEditForm, setHistoryEditForm] =
    useState<ExpenseFormValues>(createInitialFormState);
  const [isEntryFormHighlighted, setIsEntryFormHighlighted] = useState(false);
  const [deleteTargetExpense, setDeleteTargetExpense] =
    useState<Expense | null>(null);
  const [deletingExpenseId, setDeletingExpenseId] = useState<string | null>(
    null
  );
  const [error, setError] = useState("");
  const [saveSuccessMessage, setSaveSuccessMessage] = useState("");
  const selectedHistoryRange =
    historyPeriod === "custom"
      ? {
          startDate: historyStartDate,
          endDate: historyEndDate,
        }
      : getPeriodRange(historyPeriod);
  const historyDateRangeError =
    selectedHistoryRange.startDate > selectedHistoryRange.endDate
      ? "Start date must be before or equal to end date."
      : "";
  const selectedHistoryStartDate = selectedHistoryRange.startDate;
  const selectedHistoryEndDate = selectedHistoryRange.endDate;
  const isHistoryPending =
    isLoadingHistoryEntries ||
    isChangingHistoryPage ||
    loadedHistoryPage !== historyPage ||
    loadedHistoryRange.startDate !== selectedHistoryStartDate ||
      loadedHistoryRange.endDate !== selectedHistoryEndDate;
  const totalHistoryPages = Math.max(
    1,
    Math.ceil(totalHistoryEntries / HISTORY_PAGE_SIZE)
  );

  function createFormStateFromExpense(expense: Expense): ExpenseFormValues {
    const category = isKnownCategory(expense.category) ? expense.category : "Other";
    const subcategoryOptions =
      SUBCATEGORY_OPTIONS_BY_CATEGORY[expense.category] ?? [];
    const subcategory =
      expense.subcategory && subcategoryOptions.includes(expense.subcategory)
        ? expense.subcategory
        : "";

    return {
      amount: String(expense.amount),
      category,
      customCategory: category === "Other" ? expense.category : "",
      subcategory,
      customSubcategory:
        expense.subcategory && !subcategory ? expense.subcategory : "",
      description: expense.description ?? "",
      merchant: expense.merchant ?? "",
      date: expense.date.slice(0, 10),
    };
  }

  const fetchRecentEntries = useCallback(async () => {
    return getPaginatedExpenses({
      page: 1,
      limit: RECENT_ENTRIES_LIMIT,
    });
  }, []);

  const fetchHistoryEntriesPage = useCallback(
    async (page: number, startDate: string, endDate: string) => {
      return getPaginatedExpenses({
        page,
        limit: HISTORY_PAGE_SIZE,
        startDate,
        endDate,
      });
    },
    []
  );

  const refreshRecentEntries = useCallback(async () => {
    const entriesData = await fetchRecentEntries();

    setRecentEntries(entriesData.items);
  }, [fetchRecentEntries]);

  const refreshHistoryEntries = useCallback(async () => {
    if (historyDateRangeError) {
      return;
    }

    const entriesData = await fetchHistoryEntriesPage(
      historyPage,
      selectedHistoryStartDate,
      selectedHistoryEndDate
    );

    setHistoryEntries(entriesData.items);
    setHistoryPage(entriesData.page);
    setTotalHistoryEntries(entriesData.total);
    setLoadedHistoryRange({
      startDate: selectedHistoryStartDate,
      endDate: selectedHistoryEndDate,
    });
    setLoadedHistoryPage(entriesData.page);
  }, [
    fetchHistoryEntriesPage,
    historyPage,
    historyDateRangeError,
    selectedHistoryEndDate,
    selectedHistoryStartDate,
  ]);

  async function handleCreateExpense(expense: CreateExpenseInput) {
    setError("");
    setSaveSuccessMessage("");
    setIsSubmitting(true);

    try {
      if (editingExpenseId) {
        await updateExpense(editingExpenseId, expense);
      } else {
        await createExpense(expense);
      }

      await Promise.all([refreshRecentEntries(), refreshHistoryEntries()]);
      setExpenseForm(createInitialFormState());
      setEditingExpenseId(null);
      setSaveSuccessMessage(
        editingExpenseId ? "Updated successfully." : "Saved successfully."
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save entry"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleParsedExpense(parsedExpense: ParsedExpense) {
    const category = isKnownCategory(parsedExpense.category)
      ? parsedExpense.category
      : "Other";
    const subcategoryOptions =
      SUBCATEGORY_OPTIONS_BY_CATEGORY[parsedExpense.category] ?? [];
    const subcategory =
      parsedExpense.subcategory &&
      subcategoryOptions.includes(parsedExpense.subcategory)
        ? parsedExpense.subcategory
        : "";

    setExpenseForm({
      amount: String(parsedExpense.amount),
      category,
      customCategory: category === "Other" ? parsedExpense.category : "",
      subcategory,
      customSubcategory:
        parsedExpense.subcategory && !subcategory
          ? parsedExpense.subcategory
          : "",
      description: parsedExpense.description,
      merchant: parsedExpense.merchant ?? "",
      date: parsedExpense.date,
    });
    setIsEntryFormHighlighted(true);
    window.setTimeout(() => setIsEntryFormHighlighted(false), 1800);
  }

  function handleEditExpense(expense: Expense) {
    setError("");
    setSaveSuccessMessage("");
    setEditingExpenseId(expense.id);
    setExpenseForm(createFormStateFromExpense(expense));
    setIsEntryFormHighlighted(true);
    window.setTimeout(() => setIsEntryFormHighlighted(false), 1800);
    window.requestAnimationFrame(() => {
      document
        .getElementById("entry-form-panel")
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  }

  function handleEditHistoryExpense(expense: Expense) {
    setError("");
    setHistoryEditExpenseId(expense.id);
    setHistoryEditForm(createFormStateFromExpense(expense));
  }

  function closeHistoryEditDialog() {
    setHistoryEditExpenseId(null);
    setHistoryEditForm(createInitialFormState());
  }

  async function handleUpdateHistoryExpense(expense: CreateExpenseInput) {
    if (!historyEditExpenseId) {
      return;
    }

    setError("");
    setIsHistoryEditSubmitting(true);

    try {
      await updateExpense(historyEditExpenseId, expense);
      await Promise.all([refreshRecentEntries(), refreshHistoryEntries()]);
      closeHistoryEditDialog();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to update entry"
      );
    } finally {
      setIsHistoryEditSubmitting(false);
    }
  }

  async function handleConfirmDeleteExpense() {
    if (!deleteTargetExpense) {
      return;
    }

    const expense = deleteTargetExpense;
    setError("");
    setSaveSuccessMessage("");
    setDeletingExpenseId(expense.id);

    try {
      await deleteExpense(expense.id);
      await Promise.all([refreshRecentEntries(), refreshHistoryEntries()]);

      if (editingExpenseId === expense.id) {
        setEditingExpenseId(null);
        setExpenseForm(createInitialFormState());
      }

      if (historyEditExpenseId === expense.id) {
        closeHistoryEditDialog();
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to delete entry"
      );
    } finally {
      setDeletingExpenseId(null);
      setDeleteTargetExpense(null);
    }
  }

  function resetExpenseForm() {
    setEditingExpenseId(null);
    setSaveSuccessMessage("");
    setExpenseForm(createInitialFormState());
  }

  function getDeleteItemDetails(expense: Expense | null) {
    if (!expense) {
      return undefined;
    }

    const categoryLabel = expense.subcategory
      ? `${expense.category} / ${expense.subcategory}`
      : expense.category;
    const descriptionLabel = expense.description
      ? ` - ${expense.description}`
      : "";

    return `${categoryLabel} - ${formatCurrency(expense.amount)}${descriptionLabel}`;
  }

  async function handleExportCsv(params: ExportExpensesParams) {
    setError("");
    setIsExporting(true);

    try {
      const csvBlob = await exportExpensesCsv(params);
      const downloadUrl = URL.createObjectURL(csvBlob);
      const link = document.createElement("a");

      link.href = downloadUrl;
      link.download = "entries.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(downloadUrl);
      setIsExportDialogOpen(false);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to export entries"
      );
    } finally {
      setIsExporting(false);
    }
  }

  function handleHistoryPeriodChange(period: InsightPeriod) {
    setHistoryPage(1);
    setHistoryPeriod(period);
  }

  function handleHistoryStartDateChange(date: string) {
    setHistoryPage(1);
    setHistoryStartDate(date);
  }

  function handleHistoryEndDateChange(date: string) {
    setHistoryPage(1);
    setHistoryEndDate(date);
  }

  function handleHistoryPageChange(page: number) {
    if (page === historyPage) {
      return;
    }

    setIsChangingHistoryPage(true);
    setHistoryPage(page);
  }

  useEffect(() => {
    if (!saveSuccessMessage) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setSaveSuccessMessage("");
    }, 3500);

    return () => window.clearTimeout(timeoutId);
  }, [saveSuccessMessage]);

  useEffect(() => {
    void fetchRecentEntries()
      .then((entriesData) => {
        setRecentEntries(entriesData.items);
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load entries"
        );
      })
      .finally(() => {
        setIsLoadingRecentEntries(false);
      });
  }, [fetchRecentEntries]);

  useEffect(() => {
    if (historyDateRangeError) {
      return;
    }

    void fetchHistoryEntriesPage(
      historyPage,
      selectedHistoryStartDate,
      selectedHistoryEndDate
    )
      .then((entriesData) => {
        setHistoryEntries(entriesData.items);
        setHistoryPage(entriesData.page);
        setTotalHistoryEntries(entriesData.total);
        setLoadedHistoryRange({
          startDate: selectedHistoryStartDate,
          endDate: selectedHistoryEndDate,
        });
        setLoadedHistoryPage(entriesData.page);
      })
      .catch((requestError) => {
        setError(
          requestError instanceof Error
            ? requestError.message
            : "Unable to load entry history"
        );
      })
      .finally(() => {
        setIsLoadingHistoryEntries(false);
        setIsChangingHistoryPage(false);
      });
  }, [
    fetchHistoryEntriesPage,
    historyPage,
    historyDateRangeError,
    selectedHistoryEndDate,
    selectedHistoryStartDate,
  ]);

  return (
    <>
      <section className="page-header workspace-page-header entries-page-header">
        <p className="eyebrow">Entries</p>
        <h1>Add, review, and manage records.</h1>
        <p>
          Use Quick Add for natural language entry or edit structured details
          before saving.
        </p>
      </section>

      {error && <div className="error-banner">{error}</div>}
      {historyDateRangeError && (
        <div className="error-banner">{historyDateRangeError}</div>
      )}

      <section className="entry-management-section">
        <div className="section-heading">
          <p className="eyebrow">Quick Add</p>
          <h2>Start naturally, then save structured data.</h2>
        </div>
        <NaturalLanguageExpense onParsed={handleParsedExpense} />
      </section>

      <section className="entry-management-section">
        <div className="section-heading">
          <p className="eyebrow">Entry Management</p>
          <h2>Add details and keep your records clean.</h2>
        </div>
        <div className="entry-management-grid">
          <ExpenseForm
            id="entry-form-panel"
            className={isEntryFormHighlighted ? "is-highlighted-panel" : ""}
            formData={expenseForm}
            onChange={setExpenseForm}
            onReset={resetExpenseForm}
            onSubmit={handleCreateExpense}
            isSubmitting={isSubmitting}
            successMessage={saveSuccessMessage}
            isEditing={Boolean(editingExpenseId)}
          />
          <ExpenseList
            title="Recent entries"
            description={`Latest ${recentEntries.length} saved ${
              recentEntries.length === 1 ? "record" : "records"
            } for quick review.`}
            emptyMessage="No recent entries yet."
            expenses={recentEntries}
            isLoading={isLoadingRecentEntries}
            hasMore={false}
            onEdit={handleEditExpense}
            onRequestDelete={(expense) => {
              setDeleteTargetExpense(expense);
              setError("");
              setSaveSuccessMessage("");
            }}
            deletingExpenseId={deletingExpenseId}
            showCount={false}
          />
        </div>
      </section>

      <section className="entry-management-section entry-history-section">
        <div className="section-heading">
          <p className="eyebrow">Entry History</p>
          <h2>Browse records by period.</h2>
        </div>
        <div className="period-toolbar entry-history-toolbar">
          <PeriodSelector
            period={historyPeriod}
            startDate={historyStartDate}
            endDate={historyEndDate}
            onPeriodChange={handleHistoryPeriodChange}
            onStartDateChange={handleHistoryStartDateChange}
            onEndDateChange={handleHistoryEndDateChange}
          />
          <button
            className="export-csv-button"
            type="button"
            onClick={() => setIsExportDialogOpen(true)}
          >
            Export CSV
          </button>
        </div>
        <ExpenseList
          title="Entry History"
          description="Saved records for the selected period."
          emptyMessage="No entries in this period."
          expenses={historyDateRangeError ? [] : historyEntries}
          isLoading={historyDateRangeError ? false : isHistoryPending}
          isLoadingMore={isChangingHistoryPage}
          totalCount={historyDateRangeError ? 0 : totalHistoryEntries}
          currentPage={historyDateRangeError ? 1 : historyPage}
          totalPages={historyDateRangeError ? 1 : totalHistoryPages}
          onPageChange={handleHistoryPageChange}
          isScrollable={false}
          onEdit={handleEditHistoryExpense}
          onRequestDelete={(expense) => {
            setDeleteTargetExpense(expense);
            setError("");
            setSaveSuccessMessage("");
          }}
          deletingExpenseId={deletingExpenseId}
          />
      </section>

      <ExportDialog
        isOpen={isExportDialogOpen}
        isExporting={isExporting}
        onClose={() => setIsExportDialogOpen(false)}
        onExport={handleExportCsv}
      />

      {historyEditExpenseId && (
        <div className="dialog-backdrop" role="presentation">
          <section
            className="edit-entry-dialog"
            role="dialog"
            aria-modal="true"
            aria-labelledby="edit-entry-dialog-title"
          >
            <ExpenseForm
              id="edit-entry-dialog-title"
              formData={historyEditForm}
              onChange={setHistoryEditForm}
              onReset={closeHistoryEditDialog}
              onSubmit={handleUpdateHistoryExpense}
              isSubmitting={isHistoryEditSubmitting}
              successMessage=""
              isEditing
            />
          </section>
        </div>
      )}

      <DeleteConfirmDialog
        isOpen={Boolean(deleteTargetExpense)}
        itemName={
          deleteTargetExpense
            ? deleteTargetExpense.merchant ||
              deleteTargetExpense.category ||
              "entry"
            : "entry"
        }
        itemDetails={getDeleteItemDetails(deleteTargetExpense)}
        onCancel={() => setDeleteTargetExpense(null)}
        onConfirm={handleConfirmDeleteExpense}
        isDeleting={Boolean(deletingExpenseId)}
      />
    </>
  );
}

export default EntriesPage;
