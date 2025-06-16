"use client"

import { createContext, useContext, useReducer, useEffect } from "react"
import { ethers } from "ethers"
import toast from "react-hot-toast"
import VotingSystemABI from "../contracts/VotingSystem.json"

// Import deployment info with error handling
let deploymentInfo
try {
  deploymentInfo = require("../contracts/deployment.json")
} catch (error) {
  console.error("Deployment file not found. Please deploy the contract first.")
  deploymentInfo = {
    contractAddress: process.env.REACT_APP_CONTRACT_ADDRESS || "0x0000000000000000000000000000000000000000",
    electoralCommission: "0x0000000000000000000000000000000000000000",
    network: process.env.REACT_APP_NETWORK_NAME || "localhost",
    chainId: Number.parseInt(process.env.REACT_APP_NETWORK_ID) || 1337,
  }
}

const VotingContext = createContext()

const initialState = {
  account: null,
  contract: null,
  provider: null,
  signer: null,
  isConnected: false,
  isLoading: false,
  voter: null,
  currentElection: null,
  candidates: [],
  allElections: [],
  isAdmin: false,
  error: null,
  chainId: null,
}

function votingReducer(state, action) {
  switch (action.type) {
    case "SET_LOADING":
      return { ...state, isLoading: action.payload }
    case "SET_ACCOUNT":
      return { ...state, account: action.payload }
    case "SET_CONNECTION":
      return {
        ...state,
        provider: action.payload.provider,
        signer: action.payload.signer,
        contract: action.payload.contract,
        isConnected: true,
        chainId: action.payload.chainId,
      }
    case "SET_VOTER":
      return { ...state, voter: action.payload }
    case "SET_CURRENT_ELECTION":
      return { ...state, currentElection: action.payload }
    case "SET_ALL_ELECTIONS":
      return { ...state, allElections: action.payload }
    case "SET_CANDIDATES":
      return { ...state, candidates: action.payload }
    case "SET_IS_ADMIN":
      return { ...state, isAdmin: action.payload }
    case "SET_ERROR":
      return { ...state, error: action.payload }
    case "DISCONNECT":
      return { ...initialState }
    default:
      return state
  }
}

export function VotingProvider({ children }) {
  const [state, dispatch] = useReducer(votingReducer, initialState)

  // Network configurations
  const SUPPORTED_NETWORKS = {
    1337: { name: "Hardhat Local", rpcUrl: "http://127.0.0.1:8545" },
    11155111: { name: "Sepolia Testnet", rpcUrl: "https://sepolia.infura.io/v3/..." },
  }

  // Get expected network from deployment info or environment
  const expectedChainId = deploymentInfo.chainId || Number.parseInt(process.env.REACT_APP_NETWORK_ID) || 11155111

  // Robust voter ID validation function
  const validateVoterId = async (voterId) => {
    if (!voterId || !state.contract) {
      return { isValid: false, isAvailable: false, message: "Invalid input" }
    }

    try {
      const result = await state.contract.checkVoterIdAvailability(voterId)
      return {
        isValid: result.isValid,
        isAvailable: result.isAvailable,
        message: result.message,
      }
    } catch (error) {
      console.error("Validation error:", error)
      return {
        isValid: false,
        isAvailable: false,
        message: "Unable to validate voter ID at this time",
      }
    }
  }

  // Initialize Web3 connection
  const connectWallet = async () => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })

      if (!window.ethereum) {
        throw new Error("MetaMask is not installed")
      }

      // Check if contract is deployed
      const contractAddress = deploymentInfo.contractAddress || process.env.REACT_APP_CONTRACT_ADDRESS
      if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
        throw new Error("Contract not deployed. Please deploy the contract first.")
      }

      const accounts = await window.ethereum.request({
        method: "eth_requestAccounts",
      })

      // Get network info
      const chainId = await window.ethereum.request({ method: "eth_chainId" })
      const chainIdNumber = Number.parseInt(chainId, 16)

      console.log("Connected to chain:", chainIdNumber)
      console.log("Expected chain:", expectedChainId)

      // Check if on correct network
      if (chainIdNumber !== expectedChainId) {
        const networkName = SUPPORTED_NETWORKS[expectedChainId]?.name || `Chain ID ${expectedChainId}`
        throw new Error(`Please switch to ${networkName}. Current network: ${chainIdNumber}`)
      }

      // Create provider and signer
      const provider = new ethers.BrowserProvider(window.ethereum)
      const signer = await provider.getSigner()

      // Test connection to contract
      const contract = new ethers.Contract(contractAddress, VotingSystemABI.abi, signer)

      // Test contract call
      try {
        await contract.electoralCommission()
      } catch (error) {
        throw new Error("Cannot connect to contract. Make sure the contract is deployed on this network.")
      }

      dispatch({
        type: "SET_CONNECTION",
        payload: { provider, signer, contract, chainId: chainIdNumber },
      })

      dispatch({ type: "SET_ACCOUNT", payload: accounts[0] })

      // Check if user is admin
      const electoralCommission = await contract.electoralCommission()
      const isAdmin = accounts[0].toLowerCase() === electoralCommission.toLowerCase()
      dispatch({ type: "SET_IS_ADMIN", payload: isAdmin })

      // Load voter data if not admin
      if (!isAdmin) {
        await loadVoterData(contract, accounts[0])
      }

      // Load current election and all elections
      await loadCurrentElection(contract)
      await loadAllElections(contract)

      toast.success("Wallet connected successfully!")
    } catch (error) {
      console.error("Connection error:", error)
      dispatch({ type: "SET_ERROR", payload: error.message })
      toast.error(error.message)
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  // Load voter data
  const loadVoterData = async (contract, account) => {
    try {
      const voter = await contract.getVoter(account)
      if (voter.walletAddress !== "0x0000000000000000000000000000000000000000") {
        dispatch({ type: "SET_VOTER", payload: voter })
      }
    } catch (error) {
      console.error("Error loading voter data:", error)
    }
  }

  // Load current election
  const loadCurrentElection = async (contract) => {
    try {
      const election = await contract.getCurrentElection()
      console.log("Current election loaded:", election)

      if (election.id > 0) {
        dispatch({ type: "SET_CURRENT_ELECTION", payload: election })
        await loadCandidates(contract, election.id)
      } else {
        dispatch({ type: "SET_CURRENT_ELECTION", payload: null })
        dispatch({ type: "SET_CANDIDATES", payload: [] })
      }
    } catch (error) {
      console.error("Error loading current election:", error)
    }
  }

  // Load all elections
  const loadAllElections = async (contract) => {
    try {
      const electionCounter = await contract.electionCounter()
      const elections = []

      for (let i = 1; i <= electionCounter; i++) {
        try {
          const election = await contract.getElection(i)
          if (election.id > 0) {
            elections.push(election)
          }
        } catch (error) {
          console.error(`Error loading election ${i}:`, error)
        }
      }

      console.log("All elections loaded:", elections)
      dispatch({ type: "SET_ALL_ELECTIONS", payload: elections })
    } catch (error) {
      console.error("Error loading all elections:", error)
    }
  }

  // Load candidates for current election
  const loadCandidates = async (contract, electionId) => {
    try {
      const candidates = await contract.getElectionResults(electionId)
      dispatch({ type: "SET_CANDIDATES", payload: candidates })
    } catch (error) {
      console.error("Error loading candidates:", error)
    }
  }

  // Register voter
  const registerVoter = async (voterData) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })

      // Validate voter ID before submitting
      const validation = await validateVoterId(voterData.voterId)

      if (!validation.isValid || !validation.isAvailable) {
        toast.error(validation.message)
        return false
      }

      const tx = await state.contract.requestRegistration(
        voterData.voterId,
        voterData.name,
        voterData.nationalId,
        voterData.email,
      )

      await tx.wait()
      toast.success("Registration request submitted successfully!")
      return true
    } catch (error) {
      console.error("Registration error:", error)
      toast.error(error.reason || "Registration failed. Please try again.")
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  // Cast vote
  const castVote = async (candidateId) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })

      const tx = await state.contract.vote(candidateId)
      await tx.wait()

      // Reload voter data and candidates
      await loadVoterData(state.contract, state.account)
      await loadCandidates(state.contract, state.currentElection.id)

      toast.success("Vote cast successfully!")
      return true
    } catch (error) {
      console.error("Voting error:", error)
      toast.error(error.reason || error.message)
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  // Admin functions
  const verifyVoter = async (requestId) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })

      const tx = await state.contract.verifyVoter(requestId)
      await tx.wait()

      toast.success("Voter verified successfully!")
      return true
    } catch (error) {
      console.error("Verification error:", error)
      toast.error(error.reason || error.message)
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const addCandidate = async (candidateData) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })

      const tx = await state.contract.addCandidate(
        candidateData.name,
        candidateData.party,
        candidateData.imageUrl || "",
      )
      await tx.wait()

      toast.success("Candidate added successfully!")
      await loadAllElections(state.contract)
      return true
    } catch (error) {
      console.error("Add candidate error:", error)
      toast.error(error.reason || error.message)
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const createElection = async (electionData) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })

      const tx = await state.contract.createElection(
        electionData.title,
        electionData.description,
        electionData.candidateIds,
      )
      await tx.wait()

      await loadAllElections(state.contract)
      await loadCurrentElection(state.contract)

      toast.success("Election created successfully!")
      return true
    } catch (error) {
      console.error("Create election error:", error)
      toast.error(error.reason || error.message)
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const startElection = async (electionId, duration) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })

      const tx = await state.contract.startElection(electionId, duration)
      await tx.wait()

      await loadCurrentElection(state.contract)
      await loadAllElections(state.contract)

      toast.success("Election started successfully!")
      return true
    } catch (error) {
      console.error("Start election error:", error)
      toast.error(error.reason || error.message)
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  const endElection = async (electionId) => {
    try {
      dispatch({ type: "SET_LOADING", payload: true })

      const tx = await state.contract.endElection(electionId)
      await tx.wait()

      await loadCurrentElection(state.contract)
      await loadAllElections(state.contract)

      toast.success("Election ended successfully!")
      return true
    } catch (error) {
      console.error("End election error:", error)
      toast.error(error.reason || error.message)
      return false
    } finally {
      dispatch({ type: "SET_LOADING", payload: false })
    }
  }

  // Auto-connect on page load
  useEffect(() => {
    const autoConnect = async () => {
      if (window.ethereum) {
        try {
          const accounts = await window.ethereum.request({
            method: "eth_accounts",
          })
          if (accounts.length > 0) {
            await connectWallet()
          }
        } catch (error) {
          console.error("Auto-connect error:", error)
        }
      }
    }

    autoConnect()

    // Listen for account changes
    if (window.ethereum) {
      window.ethereum.on("accountsChanged", (accounts) => {
        if (accounts.length === 0) {
          dispatch({ type: "DISCONNECT" })
        } else {
          connectWallet()
        }
      })

      window.ethereum.on("chainChanged", () => {
        window.location.reload()
      })
    }

    return () => {
      if (window.ethereum) {
        window.ethereum.removeAllListeners("accountsChanged")
        window.ethereum.removeAllListeners("chainChanged")
      }
    }
  }, [])

  const value = {
    ...state,
    connectWallet,
    registerVoter,
    castVote,
    verifyVoter,
    addCandidate,
    createElection,
    startElection,
    endElection,
    validateVoterId,
    loadCurrentElection: () => loadCurrentElection(state.contract),
    loadAllElections: () => loadAllElections(state.contract),
    loadCandidates: (electionId) => loadCandidates(state.contract, electionId),
  }

  return <VotingContext.Provider value={value}>{children}</VotingContext.Provider>
}

export function useVoting() {
  const context = useContext(VotingContext)
  if (!context) {
    throw new Error("useVoting must be used within a VotingProvider")
  }
  return context
}
