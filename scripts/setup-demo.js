const hre = require("hardhat")

async function main() {
  console.log("Setting up demo data for VotingSystem...")

  try {
    // Get the deployed contract
    const deploymentPath = "./src/contracts/deployment.json"
    const fs = require("fs")

    if (!fs.existsSync(deploymentPath)) {
      console.error("❌ Deployment file not found. Please run deployment first.")
      process.exit(1)
    }

    const deploymentInfo = require("../src/contracts/deployment.json")
    console.log("📄 Contract address:", deploymentInfo.contractAddress)
    console.log("🏛️ Electoral Commission:", deploymentInfo.electoralCommission)

    const VotingSystem = await hre.ethers.getContractFactory("VotingSystem")
    const votingSystem = VotingSystem.attach(deploymentInfo.contractAddress)

    // Add demo candidates
    console.log("Adding demo candidates...")

    await votingSystem.addCandidate("Alice Johnson", "Progressive Party", "")
    console.log("✅ Added Alice Johnson (Progressive Party)")

    await votingSystem.addCandidate("Bob Smith", "Conservative Party", "")
    console.log("✅ Added Bob Smith (Conservative Party)")

    await votingSystem.addCandidate("Carol Davis", "Independent", "")
    console.log("✅ Added Carol Davis (Independent)")

    await votingSystem.addCandidate("David Wilson", "Green Party", "")
    console.log("✅ Added David Wilson (Green Party)")

    // Create demo election
    console.log("\nCreating demo election...")
    await votingSystem.createElection(
      "2024 Presidential Election",
      "National presidential election for the year 2024. Choose your preferred candidate to lead the nation.",
      [1, 2, 3, 4], // All candidate IDs
    )
    console.log("✅ Created demo election")

    // Start the election (24 hours duration)
    console.log("Starting demo election...")
    const duration = 24 * 60 * 60 // 24 hours in seconds
    await votingSystem.startElection(1, duration)
    console.log("✅ Started demo election")

    console.log("\n🎉 Demo setup complete!")
    console.log("\n📊 Demo Election Details:")
    console.log("- Title: 2024 Presidential Election")
    console.log("- Candidates: 4")
    console.log("- Duration: 24 hours")
    console.log("- Status: Active")

    console.log("\n🔑 Important Addresses:")
    console.log("- Contract:", deploymentInfo.contractAddress)
    console.log("- EC Address:", deploymentInfo.electoralCommission)
    console.log("- Network:", deploymentInfo.network)
  } catch (error) {
    console.error("❌ Error setting up demo:", error.message)
    process.exit(1)
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
