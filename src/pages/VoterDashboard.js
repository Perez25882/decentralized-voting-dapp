"use client"

import { useState, useEffect } from "react"
import { useVoting } from "../context/VotingContext"
import LoadingSpinner from "../components/LoadingSpinner"
import { Vote, Clock, CheckCircle, User, Calendar, BarChart3 } from "lucide-react"
import toast from "react-hot-toast"

function VoterDashboard() {
  const { voter, currentElection, candidates, castVote, isLoading, loadCurrentElection, loadCandidates } = useVoting()

  const [selectedCandidate, setSelectedCandidate] = useState(null)
  const [isVoting, setIsVoting] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)

  useEffect(() => {
    // Refresh data every 30 seconds
    const interval = setInterval(() => {
      loadCurrentElection()
      if (currentElection && currentElection.id > 0) {
        loadCandidates(currentElection.id)
      }
    }, 30000)

    return () => clearInterval(interval)
  }, [currentElection, loadCurrentElection, loadCandidates])

  const handleVote = async () => {
    if (!selectedCandidate) {
      toast.error("Please select a candidate")
      return
    }

    setIsVoting(true)
    try {
      const success = await castVote(selectedCandidate.id)
      if (success) {
        setShowConfirmation(false)
        setSelectedCandidate(null)
      }
    } catch (error) {
      console.error("Voting error:", error)
    } finally {
      setIsVoting(false)
    }
  }

  const getElectionStatus = () => {
    if (!currentElection || currentElection.id === 0) {
      return { status: "No Active Election", color: "gray", icon: Clock }
    }

    const now = Math.floor(Date.now() / 1000)
    const startTime = Number(currentElection.startTime)
    const endTime = Number(currentElection.endTime)

    if (!currentElection.isActive) {
      return { status: "Election Ended", color: "red", icon: Clock }
    }

    if (now < startTime) {
      return { status: "Election Not Started", color: "yellow", icon: Clock }
    }

    if (now > endTime) {
      return { status: "Election Ended", color: "red", icon: Clock }
    }

    return { status: "Voting Open", color: "green", icon: Vote }
  }

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return "Not set"
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  const hasVotedInCurrentElection = () => {
    return voter && voter.hasVoted && currentElection && Number(voter.votedElectionId) === Number(currentElection.id)
  }

  const canVote = () => {
    if (!currentElection || !currentElection.isActive) return false
    if (hasVotedInCurrentElection()) return false

    const now = Math.floor(Date.now() / 1000)
    const startTime = Number(currentElection.startTime)
    const endTime = Number(currentElection.endTime)

    return now >= startTime && now <= endTime
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading dashboard..." />
      </div>
    )
  }

  const electionStatus = getElectionStatus()
  const StatusIcon = electionStatus.icon

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Voter Dashboard</h1>
            <p className="text-gray-600 mt-1">Welcome back, {voter?.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            <User className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">ID: {voter?.voterId}</span>
          </div>
        </div>
      </div>

      {/* Election Status */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-gray-900">Election Status</h2>
          <div
            className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
              electionStatus.color === "green"
                ? "bg-green-100 text-green-800"
                : electionStatus.color === "yellow"
                  ? "bg-yellow-100 text-yellow-800"
                  : electionStatus.color === "red"
                    ? "bg-red-100 text-red-800"
                    : "bg-gray-100 text-gray-800"
            }`}
          >
            <StatusIcon className="h-4 w-4" />
            <span>{electionStatus.status}</span>
          </div>
        </div>

        {currentElection && currentElection.id > 0 ? (
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-medium text-gray-900 mb-2">{currentElection.title}</h3>
              <p className="text-gray-600 mb-4">{currentElection.description}</p>

              <div className="space-y-2 text-sm">
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Start: {formatDate(currentElection.startTime)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Calendar className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">End: {formatDate(currentElection.endTime)}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <BarChart3 className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-600">Total Votes: {Number(currentElection.totalVotes)}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-center">
              {hasVotedInCurrentElection() ? (
                <div className="text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-2" />
                  <p className="text-lg font-medium text-green-800">Vote Submitted</p>
                  <p className="text-sm text-green-600">Thank you for participating!</p>
                </div>
              ) : canVote() ? (
                <div className="text-center">
                  <Vote className="h-16 w-16 text-blue-500 mx-auto mb-2" />
                  <p className="text-lg font-medium text-blue-800">Ready to Vote</p>
                  <p className="text-sm text-blue-600">Select your candidate below</p>
                </div>
              ) : (
                <div className="text-center">
                  <Clock className="h-16 w-16 text-gray-400 mx-auto mb-2" />
                  <p className="text-lg font-medium text-gray-600">Voting Closed</p>
                  <p className="text-sm text-gray-500">Check back during voting hours</p>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-8">
            <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <p className="text-lg font-medium text-gray-600">No Active Election</p>
            <p className="text-sm text-gray-500">Please check back when an election is scheduled</p>
          </div>
        )}
      </div>

      {/* Candidates */}
      {currentElection && currentElection.id > 0 && candidates.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6">Candidates</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {candidates.map((candidate) => (
              <div
                key={candidate.id}
                className={`border rounded-lg p-4 transition-all cursor-pointer ${
                  selectedCandidate?.id === candidate.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-200 hover:border-gray-300 hover:shadow-md"
                } ${!canVote() ? "opacity-60 cursor-not-allowed" : ""}`}
                onClick={() => canVote() && setSelectedCandidate(candidate)}
              >
                <div className="text-center">
                  <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                    <User className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-1">{candidate.name}</h3>
                  <p className="text-sm text-gray-600 mb-3">{candidate.party}</p>

                  <div className="bg-gray-100 rounded-lg p-2">
                    <p className="text-lg font-bold text-gray-900">{Number(candidate.voteCount)}</p>
                    <p className="text-xs text-gray-600">votes</p>
                  </div>

                  {selectedCandidate?.id === candidate.id && canVote() && (
                    <div className="mt-3">
                      <CheckCircle className="h-6 w-6 text-blue-500 mx-auto" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Vote Button */}
          {canVote() && (
            <div className="mt-8 text-center">
              <button
                onClick={() => setShowConfirmation(true)}
                disabled={!selectedCandidate || isVoting}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              >
                {isVoting ? <LoadingSpinner size="sm" text="" /> : "Cast Vote"}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Vote Confirmation Modal */}
      {showConfirmation && selectedCandidate && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Confirm Your Vote</h3>

            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-gray-600 mb-2">You are voting for:</p>
              <p className="font-medium text-gray-900">{selectedCandidate.name}</p>
              <p className="text-sm text-gray-600">{selectedCandidate.party}</p>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-6">
              <p className="text-sm text-yellow-700">
                <strong>Warning:</strong> This action cannot be undone. You can only vote once per election.
              </p>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowConfirmation(false)}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleVote}
                disabled={isVoting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {isVoting ? <LoadingSpinner size="sm" text="" /> : "Confirm Vote"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default VoterDashboard
