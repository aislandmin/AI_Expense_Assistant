export interface Expense {
  id: string;
  amount: string | number;
  category: string;
  subcategory?: string | null;
  description?: string | null;
  merchant?: string | null;
  date: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseInput {
  amount: number;
  category: string;
  subcategory?: string;
  description?: string;
  merchant?: string;
  date: string;
}

export interface ExpenseFormValues {
  amount: string;
  category: string;
  customCategory: string;
  subcategory: string;
  customSubcategory: string;
  description: string;
  merchant: string;
  date: string;
}

export interface PaginatedExpenses {
  items: Expense[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface GetExpensesParams {
  page?: number;
  limit?: number;
  startDate?: string;
  endDate?: string;
}

export interface ExpenseInsightCategory {
  category: string;
  amount: number;
}

export interface ExpenseInsightDailyTrend {
  date: string;
  spending: number;
  income: number;
}

export interface ExpenseInsightSubcategory {
  subcategory: string;
  amount: number;
}

export interface ExpenseInsightSubcategoryGroup {
  category: string;
  subcategories: ExpenseInsightSubcategory[];
}

export interface ExpenseInsights {
  startDate: string;
  endDate: string;
  totalSpending: number;
  totalIncome: number;
  net: number;
  byCategory: ExpenseInsightCategory[];
  bySubcategory: ExpenseInsightSubcategoryGroup[];
  dailyTrend: ExpenseInsightDailyTrend[];
  topCategory: ExpenseInsightCategory | null;
  insights: string[];
}

export interface ExportExpensesParams {
  year?: number;
  month?: number;
  startDate?: string;
  endDate?: string;
}

export interface ParsedExpense {
  amount: number;
  category: string;
  subcategory: string | null;
  description: string;
  merchant: string | null;
  date: string;
}

export interface AskResponse {
  intent: string;
  answer: string;
  data: Record<string, unknown>;
}
