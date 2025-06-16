"use client"

import { useState, useEffect } from "react"
import { useNavigate } from "react-router-dom"
import { useVoting } from "../context/VotingContext"
import LoadingSpinner from "../components/LoadingSpinner"
import { UserPlus, Wallet, AlertCircle, CheckCircle, XCircle, Search } from "lucide-react"
import toast from "react-hot-toast"

function RegistrationPage() {
  const [formData, setFormData] = useState({
    voterId: "",
    name: "",
    nationalId: "",
    email: "",
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [registrationStatus, setRegistrationStatus] = useState(null)

  // FIXED: Simplified voter ID validation states
  const [voterIdValidation, setVoterIdValidation] = useState({
    isChecking: false,
    isValid: null,
    isAvailable: null,
    message: "",
    hasChecked: false,
  })

  const { connectWallet, registerVoter, isConnected, account, voter, isAdmin, isLoading, validateVoterId } = useVoting()

  const navigate = useNavigate()

  useEffect(() => {
    if (isConnected && isAdmin) {
      navigate("/admin")
    } else if (isConnected && voter && voter.isVerified) {
      navigate("/dashboard")
    }
  }, [isConnected, isAdmin, voter, navigate])

  // FIXED: Simplified validation function
  const handleValidateVoterId = async (voterId) => {
    if (!voterId.trim()) {
      setVoterIdValidation({
        isChecking: false,
        isValid: null,
        isAvailable: null,
        message: "",
        hasChecked: false,
      })
      return
    }

    setVoterIdValidation((prev) => ({ ...prev, isChecking: true }))

    try {
      const result = await validateVoterId(voterId)

      setVoterIdValidation({
        isChecking: false,
        isValid: result.isValid,
        isAvailable: result.isAvailable,
        message: result.message,
        hasChecked: true,
      })

      // Show toast for immediate feedback
      if (!result.isValid) {
        toast.error(result.message)
      } else if (!result.isAvailable) {
        toast.error(result.message)
      } else {
        toast.success("Voter ID is valid and available!")
      }
    } catch (error) {
      console.error("Validation error:", error)
      setVoterIdValidation({
        isChecking: false,
        isValid: false,
        isAvailable: false,
        message: "Error checking voter ID",
        hasChecked: false,
      })
      toast.error("Error checking voter ID")
    }
  }

  // FIXED: Debounced validation with proper cleanup
  useEffect(() => {
    if (!isConnected || !validateVoterId) return

    const timeoutId = setTimeout(() => {
      if (formData.voterId.trim()) {
        handleValidateVoterId(formData.voterId)
      }
    }, 1000)

    return () => clearTimeout(timeoutId)
  }, [formData.voterId, isConnected, validateVoterId])

  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }))

    // Reset validation when voter ID changes
    if (name === "voterId") {
      setVoterIdValidation({
        isChecking: false,
        isValid: null,
        isAvailable: null,
        message: "",
        hasChecked: false,
      })
    }
  }

  // Manual voter ID check button
  const handleCheckVoterId = () => {
    if (formData.voterId.trim()) {
      handleValidateVoterId(formData.voterId)
    } else {
      toast.error("Please enter a Voter ID first")
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!isConnected) {
      toast.error("Please connect your wallet first")
      return
    }

    // Validate form
    if (!formData.voterId.trim() || !formData.name.trim() || !formData.nationalId.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      toast.error("Please enter a valid email address")
      return
    }

    // Check voter ID validation before submitting
    if (!voterIdValidation.hasChecked) {
      // Try to validate now
      await handleValidateVoterId(formData.voterId)
      return
    }

    if (!voterIdValidation.isValid || !voterIdValidation.isAvailable) {
      toast.error("Please use a valid and available voter ID")
      return
    }

    setIsSubmitting(true)

    try {
      const success = await registerVoter(formData)
      if (success) {
        setRegistrationStatus("submitted")
        setFormData({
          voterId: "",
          name: "",
          nationalId: "",
          email: "",
        })
        setVoterIdValidation({
          isChecking: false,
          isValid: null,
          isAvailable: null,
          message: "",
          hasChecked: false,
        })
      }
    } catch (error) {
      console.error("Registration error:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Get voter ID input styling based on validation
  const getVoterIdInputStyling = () => {
    if (!voterIdValidation.hasChecked) {
      return "border-gray-300 focus:border-blue-500 focus:ring-blue-500"
    }

    if (voterIdValidation.isValid && voterIdValidation.isAvailable) {
      return "border-green-500 focus:border-green-500 focus:ring-green-500"
    } else {
      return "border-red-500 focus:border-red-500 focus:ring-red-500"
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading..." />
      </div>
    )
  }

  if (registrationStatus === "submitted") {
    return (
      <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full">
          <div className="bg-white shadow-xl rounded-lg p-8 text-center">
            <CheckCircle className="mx-auto h-16 w-16 text-green-500 mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Registration Submitted</h2>
            <p className="text-gray-600 mb-6">
              Your registration request has been submitted successfully. Please wait for the Electoral Commission to
              verify your information.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-6">
              <p className="text-sm text-blue-700">
                <strong>Next Steps:</strong>
                <br />
                1. The Electoral Commission will review your application
                <br />
                2. You'll be notified once verification is complete
                <br />
                3. Return to login once verified
              </p>
            </div>
            <button
              onClick={() => navigate("/login")}
              className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Go to Login
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <UserPlus className="mx-auto h-12 w-12 text-blue-600" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">Voter Registration</h2>
          <p className="mt-2 text-sm text-gray-600">Register to participate in secure digital voting</p>
        </div>

        <div className="bg-white shadow-xl rounded-lg p-8 space-y-6">
          {/* Valid Voter IDs Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-blue-400 mr-2 flex-shrink-0" />
              <div className="text-sm text-blue-700">
                <p className="font-medium">Notice</p>
                <p className="mt-1">
                  Register with your valid Voter ID
                  <br />
                  <span className="text-xs">Your ID will be linked to your wallet address and can only be used once</span>
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Connection */}
          <div className="space-y-4">
            <label className="block text-sm font-medium text-gray-700">Wallet Connection</label>

            {!isConnected ? (
              <button
                onClick={connectWallet}
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

          {/* Registration Form */}
          {isConnected && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Voter ID field with validation */}
              <div>
                <label htmlFor="voterId" className="block text-sm font-medium text-gray-700">
                  Voter ID *
                </label>
                <div className="mt-1 relative">
                  <input
                    id="voterId"
                    name="voterId"
                    type="text"
                    required
                    value={formData.voterId}
                    onChange={handleInputChange}
                    className={`block w-full px-3 py-2 border rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 ${getVoterIdInputStyling()}`}
                    placeholder="Enter your Voter ID (e.g., VOTER001)"
                  />

                  {/* Validation indicator */}
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    {voterIdValidation.isChecking && (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    )}
                    {!voterIdValidation.isChecking && voterIdValidation.hasChecked && (
                      <>
                        {voterIdValidation.isValid && voterIdValidation.isAvailable ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </>
                    )}
                  </div>
                </div>

                {/* Validation message */}
                {voterIdValidation.hasChecked && voterIdValidation.message && (
                  <p
                    className={`mt-1 text-sm ${
                      voterIdValidation.isValid && voterIdValidation.isAvailable ? "text-green-600" : "text-red-600"
                    }`}
                  >
                    {voterIdValidation.message}
                  </p>
                )}

                {/* Manual check button */}
                {formData.voterId.trim() && !voterIdValidation.isChecking && (
                  <button
                    type="button"
                    onClick={handleCheckVoterId}
                    className="mt-2 flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
                  >
                    <Search className="h-4 w-4" />
                    <span>Check Voter ID</span>
                  </button>
                )}
              </div>

              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name *
                </label>
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label htmlFor="nationalId" className="block text-sm font-medium text-gray-700">
                  National ID *
                </label>
                <input
                  id="nationalId"
                  name="nationalId"
                  type="text"
                  required
                  value={formData.nationalId}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your National ID"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your email (optional)"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? <LoadingSpinner size="sm" text="" /> : "Submit Registration"}
              </button>
            </form>
          )}

          {/* Login Link */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-600">
              Already registered?{" "}
              <button onClick={() => navigate("/login")} className="font-medium text-blue-600 hover:text-blue-500">
                Login here
              </button>
            </p>
          </div>

          {/* Important Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <div className="flex">
              <AlertCircle className="h-5 w-5 text-yellow-400 mr-2 flex-shrink-0" />
              <div className="text-sm text-yellow-700">
                <p className="font-medium">Important Notice</p>
                <p className="mt-1">
                  Your registration will be reviewed by the Electoral Commission. Make sure all information is accurate
                  and matches your official documents. Each Voter ID can only be used once.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default RegistrationPage
