import type { AuthResponse, LoginInput, SignupInput } from "../types/auth";
import { API_BASE_URL } from "./apiBase";

async function authRequest<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const contentType = response.headers.get("content-type") ?? "";
    const data = contentType.includes("application/json")
      ? await response.json().catch(() => null)
      : null;
    const fallbackMessage =
      response.statusText || `Request failed with status ${response.status}`;
    const message =
      data?.error ?? `Authentication request failed: ${fallbackMessage}`;
    throw new Error(message);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export function signup(input: SignupInput): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/api/auth/signup", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function login(input: LoginInput): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function getCurrentUser(): Promise<AuthResponse> {
  return authRequest<AuthResponse>("/api/auth/me");
}

export function logout(): Promise<void> {
  return authRequest<void>("/api/auth/logout", {
    method: "POST",
  });
}
