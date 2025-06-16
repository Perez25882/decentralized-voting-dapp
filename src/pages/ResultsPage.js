"use client"

import { useState, useEffect } from "react"
import { useVoting } from "../context/VotingContext"
import { BarChart3, Users, Vote, Trophy, RefreshCw } from "lucide-react"

function ResultsPage() {
  const { contract, currentElection, candidates, loadCurrentElection, loadCandidates } = useVoting()
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [lastUpdated, setLastUpdated] = useState(new Date())

  useEffect(() => {
    // Auto-refresh every 10 seconds
    const interval = setInterval(() => {
      refreshResults()
    }, 10000)

    return () => clearInterval(interval)
  }, [])

  const refreshResults = async () => {
    if (!contract) return

    setIsRefreshing(true)
    try {
      await loadCurrentElection()
      if (currentElection && currentElection.id > 0) {
        await loadCandidates(currentElection.id)
      }
      setLastUpdated(new Date())
    } catch (error) {
      console.error("Error refreshing results:", error)
    } finally {
      setIsRefreshing(false)
    }
  }

  const getTotalVotes = () => {
    return candidates.reduce((total, candidate) => total + Number(candidate.voteCount), 0)
  }

  const getVotePercentage = (voteCount) => {
    const total = getTotalVotes()
    return total > 0 ? ((Number(voteCount) / total) * 100).toFixed(1) : 0
  }

  const getSortedCandidates = () => {
    return [...candidates].sort((a, b) => Number(b.voteCount) - Number(a.voteCount))
  }

  const getElectionStatus = () => {
    if (!currentElection || currentElection.id === 0) {
      return { status: "No Active Election", color: "gray" }
    }

    const now = Math.floor(Date.now() / 1000)
    const startTime = Number(currentElection.startTime)
    const endTime = Number(currentElection.endTime)

    if (!currentElection.isActive) {
      return { status: "Election Ended", color: "red" }
    }

    if (now < startTime) {
      return { status: "Election Not Started", color: "yellow" }
    }

    if (now > endTime) {
      return { status: "Election Ended", color: "red" }
    }

    return { status: "Voting in Progress", color: "green" }
  }

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return "Not set"
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  const electionStatus = getElectionStatus()
  const sortedCandidates = getSortedCandidates()
  const totalVotes = getTotalVotes()

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Election Results</h1>
            <p className="text-gray-600 mt-1">Live results from the blockchain</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-right">
              <p className="text-sm text-gray-600">Last updated</p>
              <p className="text-sm font-medium text-gray-900">{lastUpdated.toLocaleTimeString()}</p>
            </div>
            <button
              onClick={refreshResults}
              disabled={isRefreshing}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>
      </div>

      {/* Election Status */}
      {currentElection && currentElection.id > 0 ? (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{currentElection.title}</h2>
              <p className="text-gray-600">{currentElection.description}</p>
            </div>
            <div
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${
                electionStatus.color === "green"
                  ? "bg-green-100 text-green-800"
                  : electionStatus.color === "yellow"
                    ? "bg-yellow-100 text-yellow-800"
                    : electionStatus.color === "red"
                      ? "bg-red-100 text-red-800"
                      : "bg-gray-100 text-gray-800"
              }`}
            >
              <div
                className={`w-2 h-2 rounded-full ${
                  electionStatus.color === "green"
                    ? "bg-green-500"
                    : electionStatus.color === "yellow"
                      ? "bg-yellow-500"
                      : electionStatus.color === "red"
                        ? "bg-red-500"
                        : "bg-gray-500"
                }`}
              ></div>
              <span>{electionStatus.status}</span>
            </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <Vote className="h-8 w-8 text-blue-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Votes</p>
                  <p className="text-2xl font-bold text-gray-900">{totalVotes}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-green-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Candidates</p>
                  <p className="text-2xl font-bold text-gray-900">{candidates.length}</p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <BarChart3 className="h-8 w-8 text-purple-600" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Election ID</p>
                  <p className="text-2xl font-bold text-gray-900">#{Number(currentElection.id)}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 grid md:grid-cols-2 gap-4 text-sm text-gray-600">
            <div>
              <strong>Start Time:</strong> {formatDate(currentElection.startTime)}
            </div>
            <div>
              <strong>End Time:</strong> {formatDate(currentElection.endTime)}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow-lg p-12 text-center">
          <BarChart3 className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">No Active Election</h2>
          <p className="text-gray-600">There are currently no elections in progress. Check back later for results.</p>
        </div>
      )}

      {/* Results */}
      {currentElection && currentElection.id > 0 && candidates.length > 0 && (
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">Live Results</h2>
            {totalVotes > 0 && (
              <div className="text-sm text-gray-600">
                Based on {totalVotes} vote{totalVotes !== 1 ? "s" : ""}
              </div>
            )}
          </div>

          {totalVotes === 0 ? (
            <div className="text-center py-12">
              <Vote className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-600">No Votes Cast Yet</p>
              <p className="text-sm text-gray-500">Results will appear here as votes are cast</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sortedCandidates.map((candidate, index) => {
                const voteCount = Number(candidate.voteCount)
                const percentage = getVotePercentage(voteCount)
                const isWinner = index === 0 && voteCount > 0

                return (
                  <div
                    key={candidate.id}
                    className={`relative bg-gray-50 rounded-lg p-4 ${
                      isWinner ? "ring-2 ring-yellow-400 bg-yellow-50" : ""
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        {isWinner && <Trophy className="h-5 w-5 text-yellow-500" />}
                        <div>
                          <h3 className="font-medium text-gray-900">{candidate.name}</h3>
                          <p className="text-sm text-gray-600">{candidate.party}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-gray-900">{voteCount}</p>
                        <p className="text-sm text-gray-600">{percentage}%</p>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div
                        className={`h-3 rounded-full transition-all duration-500 ${
                          isWinner ? "bg-yellow-500" : "bg-blue-500"
                        }`}
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>

                    {/* Vote Count Details */}
                    <div className="mt-2 flex justify-between items-center text-sm">
                      <span className="text-gray-600">
                        {voteCount} vote{voteCount !== 1 ? "s" : ""}
                      </span>
                      <span className="font-medium text-gray-900">{percentage}%</span>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Real-time Update Notice */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
              <p className="text-sm text-blue-700">
                <strong>Live Updates:</strong> Results are automatically updated every 10 seconds from the blockchain.
                All votes are cryptographically secured and publicly verifiable.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Transparency Notice */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Transparency & Security</h2>
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Blockchain Verification</h3>
            <p className="text-sm text-gray-600 mb-4">
              Every vote is recorded on the Ethereum blockchain and can be independently verified. The smart contract
              ensures complete transparency and immutability of results.
            </p>
            {currentElection && currentElection.id > 0 && (
              <div className="text-xs text-gray-500">
                <p>Contract Address: {contract?.target || "Loading..."}</p>
                <p>Election ID: #{Number(currentElection.id)}</p>
              </div>
            )}
          </div>
          <div>
            <h3 className="font-medium text-gray-900 mb-2">Security Features</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• One vote per verified voter</li>
              <li>• Cryptographic vote protection</li>
              <li>• Real-time result updates</li>
              <li>• Tamper-proof vote storage</li>
              <li>• Public audit trail</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ResultsPage
