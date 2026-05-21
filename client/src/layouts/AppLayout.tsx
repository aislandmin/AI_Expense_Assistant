import { Outlet } from "react-router-dom";
import AppNavbar from "../components/AppNavbar";
import Footer from "../components/Footer";

function AppLayout() {
  return (
    <main className="app-shell">
      <AppNavbar />

      <div className="app-content">
        <Outlet />
      </div>
      <Footer />
    </main>
  );
}

export default AppLayout;
