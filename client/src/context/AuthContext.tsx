import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AuthContext } from "./authContextValue";
import {
  getCurrentUser,
  login as loginRequest,
  logout as logoutRequest,
  signup as signupRequest,
} from "../services/authService";
import type { AuthUser, LoginInput, SignupInput } from "../types/auth";

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    void getCurrentUser()
      .then((response) => {
        setUser(response.user);
      })
      .catch(() => {
        setUser(null);
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const response = await loginRequest(input);
    setUser(response.user);
  }, []);

  const signup = useCallback(async (input: SignupInput) => {
    const response = await signupRequest(input);
    setUser(response.user);
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({
      user,
      isLoading,
      login,
      signup,
      logout,
    }),
    [isLoading, login, logout, signup, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
