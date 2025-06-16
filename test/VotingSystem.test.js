const { expect } = require("chai")
const { ethers } = require("hardhat")

describe("VotingSystem", () => {
  let VotingSystem
  let votingSystem
  let owner
  let electoralCommission
  let voter1
  let voter2
  let addrs

  beforeEach(async () => {
    // Get the ContractFactory and Signers here.
    VotingSystem = await ethers.getContractFactory("VotingSystem")
    ;[owner, electoralCommission, voter1, voter2, ...addrs] = await ethers.getSigners()

    // Deploy the contract
    votingSystem = await VotingSystem.deploy()
    await votingSystem.waitForDeployment()
  })

  describe("Deployment", () => {
    it("Should set the right electoral commission", async () => {
      expect(await votingSystem.electoralCommission()).to.equal("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    })

    it("Should set the right owner", async () => {
      expect(await votingSystem.owner()).to.equal("0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266")
    })

    it("Should initialize dummy voter IDs", async () => {
      expect(await votingSystem.validVoterIds("VOTER001")).to.be.true
      expect(await votingSystem.validVoterIds("VOTER020")).to.be.true
      expect(await votingSystem.validVoterIds("VOTER999")).to.be.false
    })
  })

  describe("Voter ID Management", () => {
    it("Should check voter ID availability correctly", async () => {
      const result = await votingSystem.checkVoterIdAvailability("VOTER001")
      expect(result.isValid).to.be.true
      expect(result.isAvailable).to.be.true
      expect(result.message).to.equal("Voter ID is valid and available")
    })

    it("Should reject invalid voter ID", async () => {
      const result = await votingSystem.checkVoterIdAvailability("INVALID001")
      expect(result.isValid).to.be.false
      expect(result.isAvailable).to.be.false
      expect(result.message).to.equal("Voter ID not found in Electoral Commission database")
    })

    it("Should allow EC to add valid voter IDs", async () => {
      await votingSystem.addValidVoterId("VOTER021")
      expect(await votingSystem.validVoterIds("VOTER021")).to.be.true
    })

    it("Should prevent non-EC from adding voter IDs", async () => {
      await expect(votingSystem.connect(voter1).addValidVoterId("VOTER021")).to.be.revertedWith(
        "Only Electoral Commission can perform this action",
      )
    })
  })

  describe("Voter Registration with ID Validation", () => {
    it("Should allow registration with valid voter ID", async () => {
      await votingSystem.connect(voter1).requestRegistration("VOTER001", "John Doe", "ID123456", "john@example.com")

      expect(await votingSystem.hasRegistrationRequest(voter1.address)).to.be.true
      expect(await votingSystem.usedVoterIds("VOTER001")).to.be.false // Not used until verified
    })

    it("Should prevent registration with invalid voter ID", async () => {
      await expect(
        votingSystem.connect(voter1).requestRegistration("INVALID001", "John Doe", "ID123456", "john@example.com"),
      ).to.be.revertedWith("Voter ID not found in Electoral Commission database")
    })

    it("Should prevent duplicate registration requests with same voter ID", async () => {
      await votingSystem.connect(voter1).requestRegistration("VOTER001", "John Doe", "ID123456", "john@example.com")

      await expect(
        votingSystem.connect(voter2).requestRegistration("VOTER001", "Jane Smith", "ID789012", "jane@example.com"),
      ).to.be.revertedWith("Voter ID already linked to another wallet")
    })

    it("Should mark voter ID as used after verification", async () => {
      // Request registration
      await votingSystem.connect(voter1).requestRegistration("VOTER001", "John Doe", "ID123456", "john@example.com")

      // Verify voter
      await votingSystem.verifyVoter(1)

      // Check that voter ID is now used
      expect(await votingSystem.usedVoterIds("VOTER001")).to.be.true

      // Try to register with same voter ID should fail
      await expect(
        votingSystem.connect(voter2).requestRegistration("VOTER001", "Jane Smith", "ID789012", "jane@example.com"),
      ).to.be.revertedWith("Voter ID already registered")
    })

    it("Should prevent registration with already used voter ID", async () => {
      // First registration and verification
      await votingSystem.connect(voter1).requestRegistration("VOTER001", "John Doe", "ID123456", "john@example.com")
      await votingSystem.verifyVoter(1)

      // Second attempt should fail
      await expect(
        votingSystem.connect(voter2).requestRegistration("VOTER001", "Jane Smith", "ID789012", "jane@example.com"),
      ).to.be.revertedWith("Voter ID already registered")
    })
  })

  describe("Voter Registration", () => {
    it("Should allow voter registration request with valid ID", async () => {
      await votingSystem.connect(voter1).requestRegistration("VOTER001", "John Doe", "ID123456", "john@example.com")

      expect(await votingSystem.hasRegistrationRequest(voter1.address)).to.be.true
    })

    it("Should prevent duplicate registration requests", async () => {
      await votingSystem.connect(voter1).requestRegistration("VOTER001", "John Doe", "ID123456", "john@example.com")

      await expect(
        votingSystem.connect(voter1).requestRegistration("VOTER002", "John Doe", "ID123456", "john@example.com"),
      ).to.be.revertedWith("Registration request already exists")
    })

    it("Should allow EC to verify voter", async () => {
      // First, request registration
      await votingSystem.connect(voter1).requestRegistration("VOTER001", "John Doe", "ID123456", "john@example.com")

      // Mock EC verification (since we can't use the exact EC address in tests)
      await votingSystem.verifyVoter(1)

      const voter = await votingSystem.getVoter(voter1.address)
      expect(voter.isVerified).to.be.true
      expect(voter.voterId).to.equal("VOTER001")
      expect(await votingSystem.usedVoterIds("VOTER001")).to.be.true
    })
  })

  describe("Candidate Management", () => {
    it("Should allow EC to add candidates", async () => {
      await votingSystem.addCandidate("Alice Johnson", "Democratic Party", "")

      const candidate = await votingSystem.getCandidate(1)
      expect(candidate.name).to.equal("Alice Johnson")
      expect(candidate.party).to.equal("Democratic Party")
      expect(candidate.isActive).to.be.true
    })

    it("Should prevent non-EC from adding candidates", async () => {
      await expect(
        votingSystem.connect(voter1).addCandidate("Alice Johnson", "Democratic Party", ""),
      ).to.be.revertedWith("Only Electoral Commission can perform this action")
    })

    it("Should allow EC to update candidates", async () => {
      await votingSystem.addCandidate("Alice Johnson", "Democratic Party", "")
      await votingSystem.updateCandidate(1, "Alice Smith", "Independent", "")

      const candidate = await votingSystem.getCandidate(1)
      expect(candidate.name).to.equal("Alice Smith")
      expect(candidate.party).to.equal("Independent")
    })
  })

  describe("Election Management", () => {
    beforeEach(async () => {
      // Add some candidates first
      await votingSystem.addCandidate("Alice Johnson", "Democratic Party", "")
      await votingSystem.addCandidate("Bob Smith", "Republican Party", "")
    })

    it("Should allow EC to create election", async () => {
      await votingSystem.createElection("Presidential Election 2024", "National presidential election", [1, 2])
    })

    it("Should allow EC to create election", async () => {
      await votingSystem.createElection(
        "Presidential Election 2024",
        'National presidential election", [1, 2])ection',
        [1, 2],
      )

      const election = await votingSystem.getElection(1)
      expect(election.title).to.equal("Presidential Election 2024")
      expect(election.candidateIds.length).to.equal(2)
    })

    it("Should allow EC to start election", async () => {
      await votingSystem.createElection("Presidential Election 2024", "National presidential election", [1, 2])
      await votingSystem.startElection(1, 3600) // 1 hour duration

      const election = await votingSystem.getElection(1)
      expect(election.isActive).to.be.true
      expect(await votingSystem.currentElectionId()).to.equal(1)
    })

    it("Should allow EC to end election", async () => {
      await votingSystem.createElection("Presidential Election 2024", "National presidential election", [1, 2])
      await votingSystem.startElection(1, 3600)
      await votingSystem.endElection(1)

      const election = await votingSystem.getElection(1)
      expect(election.isActive).to.be.false
    })
  })

  describe("Voting", () => {
    beforeEach(async () => {
      // Setup: Add candidates, create election, register and verify voter
      await votingSystem.addCandidate("Alice Johnson", "Democratic Party", "")
      await votingSystem.addCandidate("Bob Smith", "Republican Party", "")
      await votingSystem.createElection("Presidential Election 2024", "National presidential election", [1, 2])
      await votingSystem.startElection(1, 3600)

      // Register and verify voter
      await votingSystem.connect(voter1).requestRegistration("VOTER001", "John Doe", "ID123456", "john@example.com")
      await votingSystem.verifyVoter(1)
    })

    it("Should allow verified voter to vote", async () => {
      await votingSystem.connect(voter1).vote(1)

      const candidate = await votingSystem.getCandidate(1)
      expect(candidate.voteCount).to.equal(1)

      const voter = await votingSystem.getVoter(voter1.address)
      expect(voter.hasVoted).to.be.true
    })

    it("Should prevent double voting", async () => {
      await votingSystem.connect(voter1).vote(1)

      await expect(votingSystem.connect(voter1).vote(2)).to.be.revertedWith("Already voted in this election")
    })

    it("Should prevent unverified voter from voting", async () => {
      await expect(votingSystem.connect(voter2).vote(1)).to.be.revertedWith(
        "Only verified voters can perform this action",
      )
    })

    it("Should prevent voting for inactive candidate", async () => {
      await votingSystem.deactivateCandidate(1)

      await expect(votingSystem.connect(voter1).vote(1)).to.be.revertedWith("Candidate is not active")
    })
  })

  describe("Results and Statistics", () => {
    beforeEach(async () => {
      // Setup complete voting scenario
      await votingSystem.addCandidate("Alice Johnson", "Democratic Party", "")
      await votingSystem.addCandidate("Bob Smith", "Republican Party", "")
      await votingSystem.createElection("Presidential Election 2024", "National presidential election", [1, 2])
      await votingSystem.startElection(1, 3600)

      // Register and verify multiple voters
      await votingSystem.connect(voter1).requestRegistration("VOTER001", "John Doe", "ID123456", "john@example.com")
      await votingSystem.connect(voter2).requestRegistration("VOTER002", "Jane Smith", "ID789012", "jane@example.com")
      await votingSystem.verifyVoter(1)
      await votingSystem.verifyVoter(2)

      // Cast votes
      await votingSystem.connect(voter1).vote(1)
      await votingSystem.connect(voter2).vote(2)
    })

    it("Should return correct election results", async () => {
      const results = await votingSystem.getElectionResults(1)

      expect(results.length).to.equal(2)
      expect(results[0].voteCount).to.equal(1)
      expect(results[1].voteCount).to.equal(1)
    })

    it("Should return correct voter statistics", async () => {
      const stats = await votingSystem.getVoterStats()

      expect(stats.totalVoters).to.equal(2)
      expect(stats.verifiedVoters).to.equal(2)
      expect(stats.votedCount).to.equal(2)
    })

    it("Should track total votes in election", async () => {
      const election = await votingSystem.getCurrentElection()
      expect(election.totalVotes).to.equal(2)
    })
  })

  describe("Security and Access Control", () => {
    it("Should prevent non-EC from verifying voters", async () => {
      await votingSystem.connect(voter1).requestRegistration("VOTER001", "John Doe", "ID123456", "john@example.com")

      await expect(votingSystem.connect(voter1).verifyVoter(1)).to.be.revertedWith(
        "Only Electoral Commission can perform this action",
      )
    })

    it("Should allow EC to pause and unpause contract", async () => {
      await votingSystem.pause()
      expect(await votingSystem.paused()).to.be.true

      await votingSystem.unpause()
      expect(await votingSystem.paused()).to.be.false
    })

    it("Should prevent voting when paused", async () => {
      // Setup voting scenario
      await votingSystem.addCandidate("Alice Johnson", "Democratic Party", "")
      await votingSystem.createElection("Test Election", "Test", [1])
      await votingSystem.startElection(1, 3600)
      await votingSystem.connect(voter1).requestRegistration("VOTER001", "John Doe", "ID123456", "john@example.com")
      await votingSystem.verifyVoter(1)

      // Pause contract
      await votingSystem.pause()

      await expect(votingSystem.connect(voter1).vote(1)).to.be.revertedWith("Pausable: paused")
    })
  })
})
