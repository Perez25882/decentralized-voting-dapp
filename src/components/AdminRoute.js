import { Navigate } from "react-router-dom"
import { useVoting } from "../context/VotingContext"

function AdminRoute({ children }) {
  const { isConnected, isAdmin } = useVoting()

  if (!isConnected) {
    return <Navigate to="/login" replace />
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  return children
}

export default AdminRoute
