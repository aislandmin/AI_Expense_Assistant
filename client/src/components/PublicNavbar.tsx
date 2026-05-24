import { NavLink } from "react-router-dom";
import { useEffect, useState } from "react";
import logo from "../assets/ai-expense-logo.png";
import { useAuth } from "../context/useAuth";

function PublicNavbar() {
  const { user } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    function handleDocumentClick(event: MouseEvent) {
      const target = event.target as HTMLElement;

      if (!target.closest(".navbar")) {
        setIsMenuOpen(false);
      }
    }

    document.addEventListener("click", handleDocumentClick);

    return () => {
      document.removeEventListener("click", handleDocumentClick);
    };
  }, []);

  return (
    <nav className="navbar" aria-label="Public navigation">
      <NavLink className="navbar-brand" to="/">
        <img src={logo} alt="AI Expense Assistant Logo" aria-hidden="true" />
        <span>AI Expense Assistant</span>
      </NavLink>

      <div className="navbar-links">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/tutorial">Tutorial</NavLink>
      </div>

      <button
        className="navbar-menu-button"
        type="button"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
        aria-controls="public-navbar-menu"
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <div className="navbar-actions">
        {user ? (
          <NavLink className="primary-link-button" to="/app">
            Workspace
          </NavLink>
        ) : (
          <>
            <NavLink className="secondary-button nav-button" to="/login">
              Login
            </NavLink>
            <NavLink className="primary-link-button" to="/signup">
              Sign Up
            </NavLink>
          </>
        )}
      </div>

      <div
        className={`navbar-menu-panel${isMenuOpen ? " is-open" : ""}`}
        id="public-navbar-menu"
      >
        <NavLink to="/" end onClick={() => setIsMenuOpen(false)}>
          Home
        </NavLink>
        <NavLink to="/tutorial" onClick={() => setIsMenuOpen(false)}>
          Tutorial
        </NavLink>
      </div>
    </nav>
  );
}

export default PublicNavbar;
