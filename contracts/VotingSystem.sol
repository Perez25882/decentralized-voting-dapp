// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract VotingSystem is Ownable, ReentrancyGuard, Pausable {
    // Structs
    struct Voter {
        string voterId;
        address walletAddress;
        string name;
        string nationalId;
        string email;
        bool isVerified;
        bool hasVoted;
        uint256 votedElectionId;
        uint256 registrationTimestamp;
    }

    struct Candidate {
        uint256 id;
        string name;
        string party;
        string imageUrl;
        uint256 voteCount;
        bool isActive;
    }

    struct Election {
        uint256 id;
        string title;
        string description;
        uint256 startTime;
        uint256 endTime;
        bool isActive;
        uint256 totalVotes;
        uint256[] candidateIds;
    }

    struct VoterRegistrationRequest {
        address walletAddress;
        string voterId;
        string name;
        string nationalId;
        string email;
        uint256 timestamp;
        bool isPending;
    }

    // State variables
    address public electoralCommission;
    uint256 public currentElectionId;
    uint256 public candidateCounter;
    uint256 public electionCounter;
    uint256 public registrationRequestCounter;

    // Mappings
    mapping(address => Voter) public voters;
    mapping(string => address) public voterIdToAddress;
    mapping(uint256 => Candidate) public candidates;
    mapping(uint256 => Election) public elections;
    mapping(uint256 => VoterRegistrationRequest) public registrationRequests;
    mapping(address => bool) public hasRegistrationRequest;
    
    // Valid voter IDs database
    mapping(string => bool) public validVoterIds;
    mapping(string => bool) public usedVoterIds;

    // Arrays for iteration
    address[] public voterAddresses;
    uint256[] public activeElectionIds;

    // Events
    event VoterRegistered(address indexed voter, string voterId, string name);
    event VoterVerified(address indexed voter, string voterId);
    event CandidateAdded(uint256 indexed candidateId, string name, string party);
    event CandidateUpdated(uint256 indexed candidateId, string name, string party);
    event ElectionCreated(uint256 indexed electionId, string title);
    event ElectionStarted(uint256 indexed electionId);
    event ElectionEnded(uint256 indexed electionId);
    event VoteCast(address indexed voter, uint256 indexed candidateId, uint256 indexed electionId);
    event RegistrationRequested(address indexed requester, string voterId, string name);
    event ElectoralCommissionUpdated(address indexed oldEC, address indexed newEC);

    // Modifiers
    modifier onlyEC() {
        require(msg.sender == electoralCommission, "Only Electoral Commission can perform this action");
        _;
    }

    modifier onlyVerifiedVoter() {
        require(voters[msg.sender].isVerified, "Only verified voters can perform this action");
        _;
    }

    modifier electionExists(uint256 _electionId) {
        require(_electionId <= electionCounter && elections[_electionId].id != 0, "Election does not exist");
        _;
    }

    modifier candidateExists(uint256 _candidateId) {
        require(_candidateId <= candidateCounter && candidates[_candidateId].id != 0, "Candidate does not exist");
        _;
    }

    constructor() {
        // Set the deployer as both owner and initial Electoral Commission
        electoralCommission = msg.sender;
        _transferOwnership(msg.sender);
        
        // Initialize with dummy valid voter IDs for testing
        _initializeDummyVoterIds();
    }

    // Initialize dummy voter IDs for testing
    function _initializeDummyVoterIds() private {
        string[20] memory dummyIds = [
            "VOTER001", "VOTER002", "VOTER003", "VOTER004", "VOTER005",
            "VOTER006", "VOTER007", "VOTER008", "VOTER009", "VOTER010",
            "VOTER011", "VOTER012", "VOTER013", "VOTER014", "VOTER015",
            "VOTER016", "VOTER017", "VOTER018", "VOTER019", "VOTER020"
        ];
        
        for (uint256 i = 0; i < dummyIds.length; i++) {
            validVoterIds[dummyIds[i]] = true;
        }
    }

    // Function to update Electoral Commission (only owner can do this)
    function updateElectoralCommission(address _newEC) external onlyOwner {
        require(_newEC != address(0), "Invalid address");
        address oldEC = electoralCommission;
        electoralCommission = _newEC;
        emit ElectoralCommissionUpdated(oldEC, _newEC);
    }

    // Function to check if voter ID is valid and available
    function checkVoterIdAvailability(string memory _voterId) external view returns (bool isValid, bool isAvailable, string memory message) {
        bool isValidId = validVoterIds[_voterId];
        if (!isValidId) {
            return (false, false, "Voter ID not found in Electoral Commission database");
        }
        
        bool isUsed = usedVoterIds[_voterId];
        if (isUsed) {
            return (true, false, "Voter ID already registered");
        }
        
        address linkedAddress = voterIdToAddress[_voterId];
        if (linkedAddress != address(0)) {
            return (true, false, "Voter ID already linked to another wallet");
        }
        
        return (true, true, "Voter ID is valid and available");
    }

    // EC function to add valid voter IDs
    function addValidVoterId(string memory _voterId) external onlyEC {
        require(bytes(_voterId).length > 0, "Voter ID cannot be empty");
        require(!validVoterIds[_voterId], "Voter ID already exists");
        
        validVoterIds[_voterId] = true;
    }

    // Voter Registration Functions
    function requestRegistration(
        string memory _voterId,
        string memory _name,
        string memory _nationalId,
        string memory _email
    ) external {
        require(!hasRegistrationRequest[msg.sender], "Registration request already exists");
        require(bytes(_voterId).length > 0, "Voter ID cannot be empty");
        require(bytes(_name).length > 0, "Name cannot be empty");
        
        require(validVoterIds[_voterId], "Voter ID not found in Electoral Commission database");
        require(!usedVoterIds[_voterId], "Voter ID already registered");
        require(voterIdToAddress[_voterId] == address(0), "Voter ID already linked to another wallet");

        registrationRequestCounter++;
        registrationRequests[registrationRequestCounter] = VoterRegistrationRequest({
            walletAddress: msg.sender,
            voterId: _voterId,
            name: _name,
            nationalId: _nationalId,
            email: _email,
            timestamp: block.timestamp,
            isPending: true
        });

        hasRegistrationRequest[msg.sender] = true;
        emit RegistrationRequested(msg.sender, _voterId, _name);
    }

    function verifyVoter(uint256 _requestId) external onlyEC {
        require(_requestId <= registrationRequestCounter, "Invalid request ID");
        VoterRegistrationRequest storage request = registrationRequests[_requestId];
        require(request.isPending, "Request already processed");

        address voterAddress = request.walletAddress;
        
        require(validVoterIds[request.voterId], "Voter ID not valid");
        require(!usedVoterIds[request.voterId], "Voter ID already used");
        require(voterIdToAddress[request.voterId] == address(0), "Voter ID already registered");

        voters[voterAddress] = Voter({
            voterId: request.voterId,
            walletAddress: voterAddress,
            name: request.name,
            nationalId: request.nationalId,
            email: request.email,
            isVerified: true,
            hasVoted: false,
            votedElectionId: 0,
            registrationTimestamp: block.timestamp
        });

        voterIdToAddress[request.voterId] = voterAddress;
        usedVoterIds[request.voterId] = true;
        voterAddresses.push(voterAddress);
        request.isPending = false;
        hasRegistrationRequest[voterAddress] = false;

        emit VoterVerified(voterAddress, request.voterId);
    }

    function rejectRegistration(uint256 _requestId) external onlyEC {
        require(_requestId <= registrationRequestCounter, "Invalid request ID");
        VoterRegistrationRequest storage request = registrationRequests[_requestId];
        require(request.isPending, "Request already processed");

        hasRegistrationRequest[request.walletAddress] = false;
        request.isPending = false;
    }

    // Candidate Management Functions
    function addCandidate(
        string memory _name,
        string memory _party,
        string memory _imageUrl
    ) external onlyEC returns (uint256) {
        require(bytes(_name).length > 0, "Candidate name cannot be empty");
        require(bytes(_party).length > 0, "Party name cannot be empty");

        candidateCounter++;
        candidates[candidateCounter] = Candidate({
            id: candidateCounter,
            name: _name,
            party: _party,
            imageUrl: _imageUrl,
            voteCount: 0,
            isActive: true
        });

        emit CandidateAdded(candidateCounter, _name, _party);
        return candidateCounter;
    }

    function updateCandidate(
        uint256 _candidateId,
        string memory _name,
        string memory _party,
        string memory _imageUrl
    ) external onlyEC candidateExists(_candidateId) {
        require(bytes(_name).length > 0, "Candidate name cannot be empty");
        require(bytes(_party).length > 0, "Party name cannot be empty");

        Candidate storage candidate = candidates[_candidateId];
        candidate.name = _name;
        candidate.party = _party;
        candidate.imageUrl = _imageUrl;

        emit CandidateUpdated(_candidateId, _name, _party);
    }

    function deactivateCandidate(uint256 _candidateId) external onlyEC candidateExists(_candidateId) {
        candidates[_candidateId].isActive = false;
    }

    // Election Management Functions
    function createElection(
        string memory _title,
        string memory _description,
        uint256[] memory _candidateIds
    ) external onlyEC returns (uint256) {
        require(bytes(_title).length > 0, "Election title cannot be empty");
        require(_candidateIds.length > 0, "At least one candidate required");

        for (uint256 i = 0; i < _candidateIds.length; i++) {
            require(_candidateIds[i] <= candidateCounter && candidates[_candidateIds[i]].id != 0, "Invalid candidate ID");
            require(candidates[_candidateIds[i]].isActive, "Candidate is not active");
        }

        electionCounter++;
        elections[electionCounter] = Election({
            id: electionCounter,
            title: _title,
            description: _description,
            startTime: 0,
            endTime: 0,
            isActive: false,
            totalVotes: 0,
            candidateIds: _candidateIds
        });

        emit ElectionCreated(electionCounter, _title);
        return electionCounter;
    }

    function startElection(uint256 _electionId, uint256 _duration) external onlyEC electionExists(_electionId) {
        Election storage election = elections[_electionId];
        require(!election.isActive, "Election is already active");
        require(_duration > 0, "Duration must be greater than 0");

        require(currentElectionId == 0 || !elections[currentElectionId].isActive, "Another election is already active");

        election.startTime = block.timestamp;
        election.endTime = block.timestamp + _duration;
        election.isActive = true;
        currentElectionId = _electionId;

        activeElectionIds.push(_electionId);
        emit ElectionStarted(_electionId);
    }

    function endElection(uint256 _electionId) external onlyEC electionExists(_electionId) {
        Election storage election = elections[_electionId];
        require(election.isActive, "Election is not active");

        election.isActive = false;
        election.endTime = block.timestamp;

        if (currentElectionId == _electionId) {
            currentElectionId = 0;
        }

        for (uint256 i = 0; i < activeElectionIds.length; i++) {
            if (activeElectionIds[i] == _electionId) {
                activeElectionIds[i] = activeElectionIds[activeElectionIds.length - 1];
                activeElectionIds.pop();
                break;
            }
        }

        emit ElectionEnded(_electionId);
    }

    // Voting Functions
    function vote(uint256 _candidateId) external onlyVerifiedVoter nonReentrant whenNotPaused {
        require(currentElectionId > 0, "No active election");
        Election storage election = elections[currentElectionId];
        require(election.isActive, "Election is not active");
        require(block.timestamp >= election.startTime && block.timestamp <= election.endTime, "Election not in voting period");

        Voter storage voter = voters[msg.sender];
        require(!voter.hasVoted || voter.votedElectionId != currentElectionId, "Already voted in this election");

        bool candidateInElection = false;
        for (uint256 i = 0; i < election.candidateIds.length; i++) {
            if (election.candidateIds[i] == _candidateId) {
                candidateInElection = true;
                break;
            }
        }
        require(candidateInElection, "Candidate not in current election");
        require(candidates[_candidateId].isActive, "Candidate is not active");

        voter.hasVoted = true;
        voter.votedElectionId = currentElectionId;
        candidates[_candidateId].voteCount++;
        election.totalVotes++;

        emit VoteCast(msg.sender, _candidateId, currentElectionId);
    }

    // View Functions
    function getVoter(address _voterAddress) external view returns (Voter memory) {
        return voters[_voterAddress];
    }

    function getCandidate(uint256 _candidateId) external view returns (Candidate memory) {
        return candidates[_candidateId];
    }

    function getElection(uint256 _electionId) external view returns (Election memory) {
        return elections[_electionId];
    }

    function getCurrentElection() external view returns (Election memory) {
        if (currentElectionId == 0) {
            return Election(0, "", "", 0, 0, false, 0, new uint256[](0));
        }
        return elections[currentElectionId];
    }

    function getElectionResults(uint256 _electionId) external view electionExists(_electionId) returns (Candidate[] memory) {
        Election memory election = elections[_electionId];
        Candidate[] memory results = new Candidate[](election.candidateIds.length);
        
        for (uint256 i = 0; i < election.candidateIds.length; i++) {
            results[i] = candidates[election.candidateIds[i]];
        }
        
        return results;
    }

    function getAllVoters() external view onlyEC returns (address[] memory) {
        return voterAddresses;
    }

    function getRegistrationRequest(uint256 _requestId) external view onlyEC returns (VoterRegistrationRequest memory) {
        return registrationRequests[_requestId];
    }

    function getPendingRegistrations() external view onlyEC returns (VoterRegistrationRequest[] memory) {
        uint256 pendingCount = 0;
        for (uint256 i = 1; i <= registrationRequestCounter; i++) {
            if (registrationRequests[i].isPending) {
                pendingCount++;
            }
        }

        VoterRegistrationRequest[] memory pending = new VoterRegistrationRequest[](pendingCount);
        uint256 index = 0;
        for (uint256 i = 1; i <= registrationRequestCounter; i++) {
            if (registrationRequests[i].isPending) {
                pending[index] = registrationRequests[i];
                index++;
            }
        }

        return pending;
    }

    function getVoterStats() external view onlyEC returns (uint256 totalVoters, uint256 verifiedVoters, uint256 votedCount) {
        totalVoters = voterAddresses.length;
        verifiedVoters = 0;
        votedCount = 0;

        for (uint256 i = 0; i < voterAddresses.length; i++) {
            Voter memory voter = voters[voterAddresses[i]];
            if (voter.isVerified) {
                verifiedVoters++;
                if (voter.hasVoted && voter.votedElectionId == currentElectionId) {
                    votedCount++;
                }
            }
        }
    }

    // Emergency Functions
    function pause() external onlyEC {
        _pause();
    }

    function unpause() external onlyEC {
        _unpause();
    }
}
