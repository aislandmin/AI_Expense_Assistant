import type {
  CreateExpenseInput,
  Expense,
  ExpenseInsights,
  ExportExpensesParams,
  GetExpensesParams,
  PaginatedExpenses,
} from "../types/expense";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error ?? "Request failed";
    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export function getPaginatedExpenses(
  params: GetExpensesParams
): Promise<PaginatedExpenses> {
  const searchParams = new URLSearchParams();

  if (params.page) {
    searchParams.set("page", String(params.page));
  }

  if (params.limit) {
    searchParams.set("limit", String(params.limit));
  }

  if (params.startDate && params.endDate) {
    searchParams.set("startDate", params.startDate);
    searchParams.set("endDate", params.endDate);
  }

  return request<PaginatedExpenses>(
    `/api/expenses?${searchParams.toString()}`
  );
}

export function createExpense(expense: CreateExpenseInput): Promise<Expense> {
  return request<Expense>("/api/expenses", {
    method: "POST",
    body: JSON.stringify(expense),
  });
}

export function updateExpense(
  id: string,
  expense: CreateExpenseInput
): Promise<Expense> {
  return request<Expense>(`/api/expenses/${id}`, {
    method: "PUT",
    body: JSON.stringify(expense),
  });
}

export async function deleteExpense(id: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/expenses/${id}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error ?? "Unable to delete expense";
    throw new Error(message);
  }
}

export function getExpenseInsights(
  startDate: string,
  endDate: string
): Promise<ExpenseInsights> {
  const searchParams = new URLSearchParams({
    startDate,
    endDate,
  });

  return request<ExpenseInsights>(
    `/api/expenses/insights?${searchParams.toString()}`
  );
}

export async function exportExpensesCsv(
  params: ExportExpensesParams
): Promise<Blob> {
  const searchParams = new URLSearchParams();

  if (params.year && params.month) {
    searchParams.set("year", String(params.year));
    searchParams.set("month", String(params.month));
  }

  if (params.startDate && params.endDate) {
    searchParams.set("startDate", params.startDate);
    searchParams.set("endDate", params.endDate);
  }

  const queryString = searchParams.toString();
  const exportPath = queryString
    ? `/api/expenses/export?${queryString}`
    : "/api/expenses/export";
  const response = await fetch(`${API_BASE_URL}${exportPath}`, {
    credentials: "include",
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error ?? "Unable to export expenses";
    throw new Error(message);
  }

  return response.blob();
}
