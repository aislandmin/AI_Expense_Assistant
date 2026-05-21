import type { AuthResponse, LoginInput, SignupInput } from "../types/auth";

const API_BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:5000";

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
    const data = await response.json().catch(() => null);
    const message = data?.error ?? "Authentication request failed";
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
