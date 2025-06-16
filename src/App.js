import { BrowserRouter as Router, Routes, Route } from "react-router-dom"
import { Toaster } from "react-hot-toast"
import { VotingProvider } from "./context/VotingContext"
import Navbar from "./components/Navbar"
import LandingPage from "./pages/LandingPage"
import LoginPage from "./pages/LoginPage"
import RegistrationPage from "./pages/RegistrationPage"
import VoterDashboard from "./pages/VoterDashboard"
import AdminDashboard from "./pages/AdminDashboard"
import ResultsPage from "./pages/ResultsPage"
import ProtectedRoute from "./components/ProtectedRoute"
import AdminRoute from "./components/AdminRoute"
import "./index.css"

function App() {
  return (
    <VotingProvider>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50">
          <Navbar />
          <main className="container mx-auto px-4 py-8">
            <Routes>
              <Route path="/" element={<LandingPage />} />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<RegistrationPage />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <VoterDashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
            </Routes>
          </main>
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: "#363636",
                color: "#fff",
              },
            }}
          />
        </div>
      </Router>
    </VotingProvider>
  )
}

export default App
