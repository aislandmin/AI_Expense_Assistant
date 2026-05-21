import type { ReactNode } from "react";
import type { Expense } from "../types/expense";

interface ExpenseListProps {
  title?: string;
  description?: string;
  emptyMessage?: string;
  expenses: Expense[];
  isLoading: boolean;
  isLoadingMore?: boolean;
  totalCount?: number;
  hasMore?: boolean;
  currentPage?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  onEdit: (expense: Expense) => void;
  onRequestDelete: (expense: Expense) => void;
  onLoadMore?: () => void;
  deletingExpenseId: string | null;
  headerAction?: ReactNode;
  showCount?: boolean;
  isScrollable?: boolean;
}

function formatCurrency(value: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(Number(value));
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-").map(Number);

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function ExpenseList({
  title = "Entries",
  description = "Latest expense and income records ordered by date.",
  emptyMessage = "No entries yet.",
  expenses,
  isLoading,
  isLoadingMore = false,
  totalCount,
  hasMore = false,
  currentPage,
  totalPages,
  onPageChange,
  onEdit,
  onRequestDelete,
  onLoadMore,
  deletingExpenseId,
  headerAction,
  showCount = true,
  isScrollable = true,
}: ExpenseListProps) {
  const displayedCount = expenses.length;
  const entryCountLabel =
    totalCount !== undefined
      ? `${displayedCount} of ${totalCount} total`
      : `${displayedCount} total`;
  const canShowPagination =
    currentPage !== undefined &&
    totalPages !== undefined &&
    totalPages > 1 &&
    onPageChange !== undefined;
  const pageNumbers = canShowPagination
    ? Array.from({ length: totalPages }, (_, index) => index + 1).filter(
        (pageNumber) =>
          pageNumber === 1 ||
          pageNumber === totalPages ||
          Math.abs(pageNumber - currentPage) <= 1
      )
    : [];

  return (
    <section className="panel expense-list-panel">
      <div className="panel-header list-header">
        <div>
          <h2>{title}</h2>
          <p>{description}</p>
        </div>
        {(showCount || headerAction) && (
          <div className="list-header-actions">
            {showCount && <span>{entryCountLabel}</span>}
            {headerAction}
          </div>
        )}
      </div>

     {isLoading ? (
        <p className="muted">Loading entries...</p>
      ) : expenses.length === 0 ? (
        <p className="muted">{emptyMessage}</p>
      ) : (
        <div className={isScrollable ? "expense-list-scroll" : "expense-list-wrap"}>
          <div className="expense-list">
          {expenses.map((expense) => (
            <article className="expense-row" key={expense.id}>
              <div>
                <strong>{expense.merchant || expense.category}</strong>
                <span>
                  {expense.category}
                  {expense.subcategory ? ` / ${expense.subcategory}` : ""}
                  {expense.description ? ` - ${expense.description}` : ""}
                </span>
              </div>
              <div className="expense-meta">
                <strong>{formatCurrency(expense.amount)}</strong>
                <span>{formatDate(expense.date)}</span>
              </div>
              <div className="expense-row-actions">
                <button type="button" onClick={() => onEdit(expense)}>
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => onRequestDelete(expense)}
                  disabled={deletingExpenseId === expense.id}
                >
                  {deletingExpenseId === expense.id ? "Deleting..." : "Delete"}
                </button>
              </div>
            </article>
          ))}
          </div>
          {hasMore && onLoadMore && (
            <button
              className="secondary-button load-more-button"
              type="button"
              onClick={onLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </button>
          )}
          {canShowPagination && (
            <nav className="pagination-controls" aria-label={`${title} pages`}>
              <button
                className="secondary-button pagination-arrow"
                type="button"
                onClick={() => onPageChange(currentPage - 1)}
                disabled={isLoadingMore || currentPage <= 1}
                aria-label="Previous page"
              >
                &lt;
              </button>
              <div className="pagination-pages">
                {pageNumbers.map((pageNumber, index) => {
                  const previousPage = pageNumbers[index - 1];
                  const hasGap =
                    previousPage !== undefined && pageNumber - previousPage > 1;

                  return (
                    <span className="pagination-page-group" key={pageNumber}>
                      {hasGap && <span className="pagination-gap">...</span>}
                      <button
                        className={`pagination-page-button${
                          pageNumber === currentPage ? " is-active" : ""
                        }`}
                        type="button"
                        onClick={() => onPageChange(pageNumber)}
                        disabled={isLoadingMore || pageNumber === currentPage}
                        aria-current={
                          pageNumber === currentPage ? "page" : undefined
                        }
                      >
                        {pageNumber}
                      </button>
                    </span>
                  );
                })}
              </div>
              <button
                className="secondary-button pagination-arrow"
                type="button"
                onClick={() => onPageChange(currentPage + 1)}
                disabled={isLoadingMore || currentPage >= totalPages}
                aria-label="Next page"
              >
                &gt;
              </button>
            </nav>
          )}
        </div>
      )}
    </section>
  );
}

export default ExpenseList;
