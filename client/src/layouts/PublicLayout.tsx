import { Outlet } from "react-router-dom";
import Footer from "../components/Footer";
import PublicNavbar from "../components/PublicNavbar";

function PublicLayout() {
  return (
    <main className="app-shell">
      <PublicNavbar />
      <Outlet />
      <Footer />
    </main>
  );
}

export default PublicLayout;
