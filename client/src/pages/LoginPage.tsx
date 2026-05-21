import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/useAuth";

function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const from =
    (location.state as { from?: { pathname?: string } } | null)?.from
      ?.pathname ?? "/app";

  useEffect(() => {
    if (!error) return;
    const timeoutId = window.setTimeout(() => setError(""), 3500);

    return () => window.clearTimeout(timeoutId);
  }, [error]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);

    try {
      await login({ email, password });
      navigate(from, { replace: true });
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : "Unable to log in"
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">Login</p>
        <h1>Welcome back.</h1>
        <p className="muted">
          Log in to access your private AI Expense Assistant workspace.
        </p>

        <form className="auth-form" onSubmit={handleSubmit} autoComplete="on">
          <label htmlFor="login-email">
            Email
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              required
            />
          </label>
          <label htmlFor="login-password">
            Password
            <div className="password-input-wrap">
              <input
                id="login-password"
                name="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                title={showPassword ? "Hide password" : "Show password"}
              >
                <svg aria-hidden="true" viewBox="0 0 24 24" focusable="false">
                  {showPassword ? (
                    <>
                      <path d="M3 3l18 18" />
                      <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                      <path d="M9.9 4.2A9.8 9.8 0 0 1 12 4c5.5 0 9 5 9 8a8.4 8.4 0 0 1-2.2 3.9" />
                      <path d="M6.6 6.6C4.4 8 3 10.2 3 12c0 3 3.5 8 9 8 1.5 0 2.9-.4 4.1-1" />
                    </>
                  ) : (
                    <>
                      <path d="M2.5 12S6 5 12 5s9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />
                    </>
                  )}
                </svg>
              </button>
            </div>
          </label>
          {error && <p className="form-error">{error}</p>}
          <button className="primary-link-button" type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Logging in..." : "Login"}
          </button>
        </form>

        <p className="auth-switch">
          New here? <Link to="/signup">Create an account</Link>
        </p>
      </section>
    </div>
  );
}

export default LoginPage;
