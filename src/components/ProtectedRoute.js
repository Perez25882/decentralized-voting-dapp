import { Navigate } from "react-router-dom"
import { useVoting } from "../context/VotingContext"

function ProtectedRoute({ children }) {
  const { isConnected, voter } = useVoting()

  if (!isConnected) {
    return <Navigate to="/login" replace />
  }

  if (!voter || !voter.isVerified) {
    return <Navigate to="/register" replace />
  }

  return children
}

export default ProtectedRoute
