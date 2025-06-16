"use client"

import { useState, useEffect } from "react"
import { useVoting } from "../context/VotingContext"
import LoadingSpinner from "../components/LoadingSpinner"
import { Users, UserCheck, Vote, Plus, Play, Square, BarChart3, Clock, CheckCircle, XCircle } from "lucide-react"
import toast from "react-hot-toast"

function AdminDashboard() {
  const {
    contract,
    addCandidate,
    createElection,
    startElection,
    endElection,
    verifyVoter,
    isLoading,
    currentElection,
    allElections,
    loadCurrentElection,
    loadAllElections,
  } = useVoting()

  const [activeTab, setActiveTab] = useState("overview")
  const [pendingRegistrations, setPendingRegistrations] = useState([])
  const [allVoters, setAllVoters] = useState([])
  const [voterStats, setVoterStats] = useState({ totalVoters: 0, verifiedVoters: 0, votedCount: 0 })
  const [allCandidates, setAllCandidates] = useState([])
  const [isLoadingData, setIsLoadingData] = useState(false)

  // Form states
  const [candidateForm, setCandidateForm] = useState({ name: "", party: "", imageUrl: "" })
  const [electionForm, setElectionForm] = useState({ title: "", description: "", candidateIds: [] })
  const [electionDuration, setElectionDuration] = useState(24) // hours

  useEffect(() => {
    loadAdminData()
    const interval = setInterval(loadAdminData, 30000) // Refresh every 30 seconds
    return () => clearInterval(interval)
  }, [contract])

  const loadAdminData = async () => {
    if (!contract) return

    setIsLoadingData(true)
    try {
      // Load pending registrations
      const pending = await contract.getPendingRegistrations()
      setPendingRegistrations(pending)

      // Load voter stats
      const stats = await contract.getVoterStats()
      setVoterStats({
        totalVoters: Number(stats.totalVoters),
        verifiedVoters: Number(stats.verifiedVoters),
        votedCount: Number(stats.votedCount),
      })

      // Load all candidates
      const candidateCounter = await contract.candidateCounter()
      const candidates = []
      for (let i = 1; i <= candidateCounter; i++) {
        try {
          const candidate = await contract.getCandidate(i)
          if (candidate.id > 0) {
            candidates.push(candidate)
          }
        } catch (error) {
          console.error(`Error loading candidate ${i}:`, error)
        }
      }
      setAllCandidates(candidates)

      // Refresh elections data
      await loadCurrentElection()
      await loadAllElections()
    } catch (error) {
      console.error("Error loading admin data:", error)
      toast.error("Error loading admin data")
    } finally {
      setIsLoadingData(false)
    }
  }

  const handleVerifyVoter = async (requestId) => {
    try {
      const success = await verifyVoter(requestId)
      if (success) {
        await loadAdminData()
      }
    } catch (error) {
      console.error("Error verifying voter:", error)
    }
  }

  const handleRejectVoter = async (requestId) => {
    try {
      const tx = await contract.rejectRegistration(requestId)
      await tx.wait()
      toast.success("Registration rejected")
      await loadAdminData()
    } catch (error) {
      console.error("Error rejecting voter:", error)
      toast.error(error.reason || error.message)
    }
  }

  const handleAddCandidate = async (e) => {
    e.preventDefault()
    if (!candidateForm.name.trim() || !candidateForm.party.trim()) {
      toast.error("Please fill in all required fields")
      return
    }

    const success = await addCandidate(candidateForm)
    if (success) {
      setCandidateForm({ name: "", party: "", imageUrl: "" })
      await loadAdminData()
    }
  }

  const handleCreateElection = async (e) => {
    e.preventDefault()
    if (!electionForm.title.trim() || electionForm.candidateIds.length === 0) {
      toast.error("Please fill in all required fields and select candidates")
      return
    }

    const success = await createElection(electionForm)
    if (success) {
      setElectionForm({ title: "", description: "", candidateIds: [] })
      await loadAdminData()
    }
  }

  const handleStartElection = async (electionId) => {
    const durationInSeconds = electionDuration * 60 * 60 // Convert hours to seconds
    const success = await startElection(electionId, durationInSeconds)
    if (success) {
      await loadAdminData()
    }
  }

  const handleEndElection = async (electionId) => {
    const success = await endElection(electionId)
    if (success) {
      await loadAdminData()
    }
  }

  const formatDate = (timestamp) => {
    if (!timestamp || timestamp === 0) return "Not set"
    return new Date(Number(timestamp) * 1000).toLocaleString()
  }

  const getElectionStatus = (election = currentElection) => {
    if (!election || election.id === 0) {
      return { status: "No Active Election", color: "gray" }
    }

    const now = Math.floor(Date.now() / 1000)
    const startTime = Number(election.startTime)
    const endTime = Number(election.endTime)

    if (!election.isActive) {
      return { status: "Election Ended", color: "red" }
    }

    if (now < startTime) {
      return { status: "Election Not Started", color: "yellow" }
    }

    if (now > endTime) {
      return { status: "Election Ended", color: "red" }
    }

    return { status: "Voting Open", color: "green" }
  }

  const electionStatus = getElectionStatus()

  // Get the latest created election (might not be started yet)
  const latestElection = allElections && allElections.length > 0 ? allElections[allElections.length - 1] : null

  // Display election - prioritize current active election, then latest created
  const displayElection = currentElection && currentElection.id > 0 ? currentElection : latestElection

  if (isLoading || isLoadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <LoadingSpinner size="lg" text="Loading admin dashboard..." />
      </div>
    )
  }

  return (
    <div className="max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-lg p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Electoral Commission Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage elections, candidates, and voter registrations</p>
          </div>
          <div className="flex items-center space-x-2 px-3 py-1 bg-red-100 text-red-800 rounded-full text-sm font-medium">
            <CheckCircle className="h-4 w-4" />
            <span>Electoral Commission</span>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid md:grid-cols-4 gap-6">
        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Voters</p>
              <p className="text-2xl font-bold text-gray-900">{voterStats.totalVoters}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <UserCheck className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Verified Voters</p>
              <p className="text-2xl font-bold text-gray-900">{voterStats.verifiedVoters}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <Vote className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Votes Cast</p>
              <p className="text-2xl font-bold text-gray-900">{voterStats.votedCount}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-lg p-6">
          <div className="flex items-center">
            <BarChart3 className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Total Elections</p>
              <p className="text-2xl font-bold text-gray-900">{allElections ? allElections.length : 0}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-lg shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: "overview", label: "Overview", icon: BarChart3 },
              { id: "registrations", label: "Registrations", icon: UserCheck },
              { id: "candidates", label: "Candidates", icon: Users },
              { id: "elections", label: "Elections", icon: Vote },
            ].map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === "overview" && (
            <div className="space-y-6">
              {/* Current Election Status */}
              <div className="bg-gray-50 rounded-lg p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Election Status</h3>
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
                    <span>{electionStatus.status}</span>
                  </div>
                </div>

                {displayElection && displayElection.id > 0 ? (
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">{displayElection.title}</h4>
                      <p className="text-gray-600 mb-4">{displayElection.description}</p>

                      <div className="space-y-2 text-sm">
                        <p>
                          <strong>Election ID:</strong> #{Number(displayElection.id)}
                        </p>
                        <p>
                          <strong>Start:</strong> {formatDate(displayElection.startTime)}
                        </p>
                        <p>
                          <strong>End:</strong> {formatDate(displayElection.endTime)}
                        </p>
                        <p>
                          <strong>Total Votes:</strong> {Number(displayElection.totalVotes)}
                        </p>
                        <p>
                          <strong>Candidates:</strong>{" "}
                          {displayElection.candidateIds ? displayElection.candidateIds.length : 0}
                        </p>
                        <p>
                          <strong>Status:</strong> {displayElection.isActive ? "Active" : "Inactive"}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {!displayElection.isActive && Number(displayElection.startTime) === 0 ? (
                        <div className="space-y-2">
                          <div className="flex items-center space-x-2">
                            <input
                              type="number"
                              value={electionDuration}
                              onChange={(e) => setElectionDuration(Number(e.target.value))}
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                              placeholder="Duration (hours)"
                              min="1"
                            />
                            <span className="text-sm text-gray-600">hours</span>
                          </div>
                          <button
                            onClick={() => handleStartElection(displayElection.id)}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                          >
                            <Play className="h-4 w-4" />
                            <span>Start Election</span>
                          </button>
                        </div>
                      ) : displayElection.isActive ? (
                        <button
                          onClick={() => handleEndElection(displayElection.id)}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                        >
                          <Square className="h-4 w-4" />
                          <span>End Election</span>
                        </button>
                      ) : (
                        <div className="text-center py-4">
                          <p className="text-gray-600">Election has ended</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Clock className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-600">No Elections Created</p>
                    <p className="text-sm text-gray-500">Create an election to get started</p>
                  </div>
                )}
              </div>

              {/* Recent Activity */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Pending Actions</h3>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-700">
                    <strong>{pendingRegistrations.length}</strong> voter registrations pending approval
                  </p>
                </div>
              </div>

              {/* All Elections Summary */}
              {allElections && allElections.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">All Elections</h3>
                  <div className="space-y-3">
                    {allElections.map((election) => (
                      <div key={election.id} className="bg-white border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">
                              #{Number(election.id)} - {election.title}
                            </h4>
                            <p className="text-sm text-gray-600">{election.description}</p>
                          </div>
                          <div className="text-right">
                            <div
                              className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                election.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              {election.isActive ? "Active" : "Inactive"}
                            </div>
                            <p className="text-sm text-gray-600 mt-1">{Number(election.totalVotes)} votes</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Registrations Tab */}
          {activeTab === "registrations" && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Pending Registrations</h3>
                <span className="text-sm text-gray-600">{pendingRegistrations.length} pending</span>
              </div>

              {pendingRegistrations.length === 0 ? (
                <div className="text-center py-8">
                  <UserCheck className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-600">No Pending Registrations</p>
                  <p className="text-sm text-gray-500">All voter registrations have been processed</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRegistrations.map((request, index) => (
                    <div key={index} className="bg-gray-50 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="grid md:grid-cols-2 gap-4">
                            <div>
                              <p className="font-medium text-gray-900">{request.name}</p>
                              <p className="text-sm text-gray-600">Voter ID: {request.voterId}</p>
                              <p className="text-sm text-gray-600">National ID: {request.nationalId}</p>
                            </div>
                            <div>
                              <p className="text-sm text-gray-600">Email: {request.email || "Not provided"}</p>
                              <p className="text-sm text-gray-600">
                                Wallet: {request.walletAddress.slice(0, 6)}...{request.walletAddress.slice(-4)}
                              </p>
                              <p className="text-sm text-gray-600">Submitted: {formatDate(request.timestamp)}</p>
                            </div>
                          </div>
                        </div>
                        <div className="flex space-x-2 ml-4">
                          <button
                            onClick={() => handleVerifyVoter(index + 1)}
                            className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                          >
                            <CheckCircle className="h-4 w-4" />
                            <span>Approve</span>
                          </button>
                          <button
                            onClick={() => handleRejectVoter(index + 1)}
                            className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                          >
                            <XCircle className="h-4 w-4" />
                            <span>Reject</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Candidates Tab */}
          {activeTab === "candidates" && (
            <div className="space-y-6">
              {/* Add Candidate Form */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Candidate</h3>
                <form onSubmit={handleAddCandidate} className="grid md:grid-cols-3 gap-4">
                  <input
                    type="text"
                    placeholder="Candidate Name"
                    value={candidateForm.name}
                    onChange={(e) => setCandidateForm({ ...candidateForm, name: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Party Name"
                    value={candidateForm.party}
                    onChange={(e) => setCandidateForm({ ...candidateForm, party: e.target.value })}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    className="flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Add Candidate</span>
                  </button>
                </form>
              </div>

              {/* Candidates List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">All Candidates ({allCandidates.length})</h3>
                {allCandidates.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-600">No Candidates</p>
                    <p className="text-sm text-gray-500">Add candidates to get started</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {allCandidates.map((candidate) => (
                      <div key={candidate.id} className="bg-white border rounded-lg p-4">
                        <div className="text-center">
                          <div className="w-16 h-16 bg-gray-200 rounded-full mx-auto mb-3 flex items-center justify-center">
                            <Users className="h-8 w-8 text-gray-400" />
                          </div>
                          <h4 className="font-medium text-gray-900">
                            #{Number(candidate.id)} - {candidate.name}
                          </h4>
                          <p className="text-sm text-gray-600 mb-2">{candidate.party}</p>
                          <div className="bg-gray-100 rounded-lg p-2 mb-3">
                            <p className="text-lg font-bold text-gray-900">{Number(candidate.voteCount)}</p>
                            <p className="text-xs text-gray-600">votes</p>
                          </div>
                          <div
                            className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              candidate.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            }`}
                          >
                            {candidate.isActive ? "Active" : "Inactive"}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Elections Tab */}
          {activeTab === "elections" && (
            <div className="space-y-6">
              {/* Create Election Form */}
              <div className="bg-gray-50 rounded-lg p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Election</h3>
                <form onSubmit={handleCreateElection} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Election Title"
                      value={electionForm.title}
                      onChange={(e) => setElectionForm({ ...electionForm, title: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Election Description"
                      value={electionForm.description}
                      onChange={(e) => setElectionForm({ ...electionForm, description: e.target.value })}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select Candidates for this Election ({electionForm.candidateIds.length} selected)
                    </label>
                    <div className="grid md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-3">
                      {allCandidates
                        .filter((c) => c.isActive)
                        .map((candidate) => (
                          <label key={candidate.id} className="flex items-center space-x-2">
                            <input
                              type="checkbox"
                              checked={electionForm.candidateIds.includes(Number(candidate.id))}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setElectionForm({
                                    ...electionForm,
                                    candidateIds: [...electionForm.candidateIds, Number(candidate.id)],
                                  })
                                } else {
                                  setElectionForm({
                                    ...electionForm,
                                    candidateIds: electionForm.candidateIds.filter((id) => id !== Number(candidate.id)),
                                  })
                                }
                              }}
                              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            />
                            <span className="text-sm text-gray-700">
                              #{Number(candidate.id)} {candidate.name} ({candidate.party})
                            </span>
                          </label>
                        ))}
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={allCandidates.filter((c) => c.isActive).length === 0}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Create Election</span>
                  </button>
                </form>
              </div>

              {/* All Elections List */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  All Elections ({allElections ? allElections.length : 0})
                </h3>

                {!allElections || allElections.length === 0 ? (
                  <div className="text-center py-8">
                    <Vote className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium text-gray-600">No Elections Created</p>
                    <p className="text-sm text-gray-500">Create your first election above</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {allElections.map((election) => {
                      const status = getElectionStatus(election)
                      return (
                        <div key={election.id} className="bg-white border rounded-lg p-6">
                          <div className="flex items-center justify-between mb-4">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">
                                #{Number(election.id)} - {election.title}
                              </h4>
                              <p className="text-gray-600">{election.description}</p>
                            </div>
                            <div
                              className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${
                                status.color === "green"
                                  ? "bg-green-100 text-green-800"
                                  : status.color === "yellow"
                                    ? "bg-yellow-100 text-yellow-800"
                                    : status.color === "red"
                                      ? "bg-red-100 text-red-800"
                                      : "bg-gray-100 text-gray-800"
                              }`}
                            >
                              <span>{status.status}</span>
                            </div>
                          </div>

                          <div className="grid md:grid-cols-2 gap-6">
                            <div className="space-y-2 text-sm">
                              <p>
                                <strong>Start Time:</strong> {formatDate(election.startTime)}
                              </p>
                              <p>
                                <strong>End Time:</strong> {formatDate(election.endTime)}
                              </p>
                              <p>
                                <strong>Total Votes:</strong> {Number(election.totalVotes)}
                              </p>
                              <p>
                                <strong>Candidates:</strong> {election.candidateIds ? election.candidateIds.length : 0}
                              </p>
                            </div>

                            <div className="flex items-center justify-end space-x-2">
                              {!election.isActive && Number(election.startTime) === 0 ? (
                                <button
                                  onClick={() => handleStartElection(election.id)}
                                  className="flex items-center space-x-1 px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                                >
                                  <Play className="h-4 w-4" />
                                  <span>Start</span>
                                </button>
                              ) : election.isActive ? (
                                <button
                                  onClick={() => handleEndElection(election.id)}
                                  className="flex items-center space-x-1 px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm"
                                >
                                  <Square className="h-4 w-4" />
                                  <span>End</span>
                                </button>
                              ) : (
                                <span className="text-sm text-gray-500">Completed</span>
                              )}
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard
