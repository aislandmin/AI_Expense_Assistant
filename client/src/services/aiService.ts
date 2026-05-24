import type { AskResponse, ParsedExpense } from "../types/expense";
import { API_BASE_URL } from "./apiBase";

export async function parseExpenseText(text: string): Promise<ParsedExpense> {
  const response = await fetch(`${API_BASE_URL}/api/ai/parse-expense`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ text }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error ?? "Unable to parse expense text";
    throw new Error(message);
  }

  return response.json() as Promise<ParsedExpense>;
}

export async function askFinancialQuestion(
  question: string
): Promise<AskResponse> {
  const response = await fetch(`${API_BASE_URL}/api/ai/ask`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ question }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => null);
    const message = data?.error ?? "Unable to answer question";
    throw new Error(message);
  }

  return response.json() as Promise<AskResponse>;
}
