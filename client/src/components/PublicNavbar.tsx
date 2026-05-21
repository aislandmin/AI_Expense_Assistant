import { NavLink } from "react-router-dom";
import logo from "../assets/ai-expense-logo.png";
import { useAuth } from "../context/useAuth";

function PublicNavbar() {
  const { user } = useAuth();

  return (
    <nav className="navbar" aria-label="Public navigation">
      <NavLink className="navbar-brand" to="/">
        <img src={logo} alt="AI Expense Assistant Logo" aria-hidden="true" />
        AI Expense Assistant
      </NavLink>

      <div className="navbar-links">
        <NavLink to="/" end>
          Home
        </NavLink>
        <NavLink to="/tutorial">Tutorial</NavLink>
      </div>

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
    </nav>
  );
}

export default PublicNavbar;
