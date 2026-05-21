import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import "./App.css";
import ProtectedRoute from "./components/ProtectedRoute";
import { AuthProvider } from "./context/AuthContext";
import AppLayout from "./layouts/AppLayout";
import PublicLayout from "./layouts/PublicLayout";
import AskPage from "./pages/AskPage";
import EntriesPage from "./pages/EntriesPage";
import HomePage from "./pages/HomePage";
import InsightsPage from "./pages/InsightsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";
import TutorialPage from "./pages/TutorialPage";

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route element={<PublicLayout />}>
            <Route index element={<HomePage />} />
            <Route path="features" element={<Navigate to="/" replace />} />
            <Route path="tutorial" element={<TutorialPage />} />
            <Route path="login" element={<LoginPage />} />
            <Route path="signup" element={<SignupPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route path="app" element={<AppLayout />}>
              <Route index element={<InsightsPage />} />
              <Route path="ask" element={<AskPage />} />
              <Route path="entries" element={<EntriesPage />} />
              <Route path="insights" element={<InsightsPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
