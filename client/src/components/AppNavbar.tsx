import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import logo from "../assets/ai-expense-logo.png";
import { useAuth } from "../context/useAuth";

function AppNavbar() {
  const { logout, user } = useAuth();
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

  async function handleLogout() {
    setIsMenuOpen(false);
    await logout();
  }

  return (
    <nav className="navbar" aria-label="App navigation">
      <NavLink className="navbar-brand" to="/">
        <img src={logo} alt="AI Expense Assistant Logo" aria-hidden="true" />
        <span>AI Expense Assistant</span>
      </NavLink>

      <div className="navbar-links">
        <NavLink to="/app/insights">See Trends</NavLink>
        <NavLink to="/app/ask">Ask Money</NavLink>
        <NavLink to="/app/entries">Manage Records</NavLink>
      </div>

      <button
        className="navbar-menu-button"
        type="button"
        aria-label={isMenuOpen ? "Close menu" : "Open menu"}
        aria-expanded={isMenuOpen}
        aria-controls="app-navbar-menu"
        onClick={() => setIsMenuOpen((current) => !current)}
      >
        <span aria-hidden="true" />
        <span aria-hidden="true" />
        <span aria-hidden="true" />
      </button>

      <div className="navbar-actions">
        {user && <span className="nav-user">{user.name}</span>}
        <button className="nav-logout" type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>

      <div
        className={`navbar-menu-panel${isMenuOpen ? " is-open" : ""}`}
        id="app-navbar-menu"
      >
        <NavLink to="/app/insights" onClick={() => setIsMenuOpen(false)}>
          See Trends
        </NavLink>
        <NavLink to="/app/ask" onClick={() => setIsMenuOpen(false)}>
          Ask Money
        </NavLink>
        <NavLink to="/app/entries" onClick={() => setIsMenuOpen(false)}>
          Manage Records
        </NavLink>
        <button type="button" onClick={handleLogout}>
          Logout
        </button>
      </div>
    </nav>
  );
}

export default AppNavbar;
