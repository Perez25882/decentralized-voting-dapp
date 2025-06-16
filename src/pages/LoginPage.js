"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useVoting } from "../context/VotingContext"
import LoadingSpinner from "../components/LoadingSpinner"
import { Wallet, User, AlertCircle } from "lucide-react"
import toast from "react-hot-toast"

function LoginPage() {
  const [voterId, setVoterId] = useState("")
  const [isValidating, setIsValidating] = useState(false)
  const { connectWallet, isConnected, account, voter, isAdmin, isLoading, contract } = useVoting()
  const navigate = useNavigate()

  useEffect(() => {
    if (isConnected && isAdmin) {
      navigate("/admin")
    } else if (isConnected && voter && voter.isVerified) {
      navigate("/dashboard")
    }
  }, [isConnected, isAdmin, voter, navigate])

  const handleConnect = async () => {
    if (!isConnected) {
      await connectWallet()
    }
  }

  const handleValidateVoter = async (e) => {
    e.preventDefault()

    if (!voterId.trim()) {
      toast.error("Please enter your Voter ID")
      return
    }

    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    setIsValidating(true)

    try {
      // Check if voter ID exists and is linked to current wallet
      const voterAddress = await contract.voterIdToAddress(voterId)

      if (voterAddress === "0x0000000000000000000000000000000000000000") {
        toast.error("Voter ID not found. Please register first.")
        navigate("/register")
        return
      }

      if (voterAddress.toLowerCase() !== account.toLowerCase()) {
        toast.error("This Voter ID is not linked to your wallet address")
        return
      }

      const voterData = await contract.getVoter(account)

      if (!voterData.isVerified) {
        toast.error("Your registration is pending verification by the Electoral Commission")
        return
      }

      toast.success("Login successful!")
      navigate("/dashboard")
    } catch (error) {
      console.error("Validation error:", error)
      toast.error("Error validating voter ID. Please try again.")
    } finally {
      setIsValidating(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Connecting to blockchain..." />
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <User className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Voter Login</h2>
          <p className="mt-2 text-sm text-gray-600">
            Connect your wallet and enter your Voter ID to access the voting system
          </p>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8 space-y-6">
          {/* Wallet Connection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Wallet Connection</label>

            {!isConnected ? (
              <button
                onClick={handleConnect}
                className="w-full flex items-center justify-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Wallet className="h-5 w-5 mr-2" />
                Connect MetaMask Wallet
              </button>
            ) : (
              <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-md">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-green-800">Wallet Connected</p>
                  <p className="text-xs text-green-600">
                    {account?.slice(0, 6)}...{account?.slice(-4)}
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Voter ID Form */}
          {isConnected && (
            <form onSubmit={handleValidateVoter} className="space-y-4">
              <div>
                <label htmlFor="voterId" className="block text-sm font-medium text-gray-700">
                  Voter ID
                </label>
                <input
                  id="voterId"
                  name="voterId"
                  type="text"
                  required
                  value={voterId}
                  onChange={(e) => setVoterId(e.target.value)}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your Voter ID"
                />
              </div>

              <button
                type="submit"
                disabled={isValidating || !voterId.trim()}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isValidating ? <LoadingSpinner size="sm" text="" /> : "Validate & Login"}
              </button>
            </form>
          )}

          {/* Registration Link */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Don't have a Voter ID registered?{" "}
              <button onClick={() => navigate("/register")} className="font-medium text-blue-600 hover:text-blue-500">
                Register here
              </button>
            </p>
          </div>

          {/* Security Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium">Security Notice</p>
                <p className="mt-1">
                  Make sure you're using the correct wallet address associated with your Voter ID. Never share your
                  private keys or seed phrase.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoginPage
