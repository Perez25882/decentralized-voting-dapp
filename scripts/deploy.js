const hre = require("hardhat")

async function main() {
  console.log("Deploying VotingSystem contract...")

  // Get the deployer account
  const [deployer] = await hre.ethers.getSigners()
  console.log("Deploying with account:", deployer.address)

  // Check balance - Fixed for ethers v5 compatibility
  const balance = await deployer.getBalance()
  console.log("Account balance:", hre.ethers.utils.formatEther(balance), "ETH")

  // Get the ContractFactory
  const VotingSystem = await hre.ethers.getContractFactory("VotingSystem")

  // Deploy the contract
  console.log("Deploying contract...")
  const votingSystem = await VotingSystem.deploy()

  // Wait for deployment
  await votingSystem.deployed()

  const contractAddress = votingSystem.address
  console.log("VotingSystem deployed to:", contractAddress)

  // Get the Electoral Commission address (deployer)
  const electoralCommission = await votingSystem.electoralCommission()
  console.log("Electoral Commission address:", electoralCommission)

  // Save deployment info
  const fs = require("fs")
  const deploymentInfo = {
    contractAddress: contractAddress,
    electoralCommission: electoralCommission,
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deploymentTime: new Date().toISOString(),
    deployerAddress: deployer.address,
  }

  // Ensure contracts directory exists
  const contractsDir = "./src/contracts"
  if (!fs.existsSync(contractsDir)) {
    fs.mkdirSync(contractsDir, { recursive: true })
  }

  fs.writeFileSync("./src/contracts/deployment.json", JSON.stringify(deploymentInfo, null, 2))
  console.log("Deployment info saved to src/contracts/deployment.json")

  // Verify contract on Etherscan if not on localhost
  if (hre.network.name !== "hardhat" && hre.network.name !== "localhost") {
    console.log("Waiting for block confirmations...")

    // Wait for 6 confirmations
    const receipt = await votingSystem.deployTransaction.wait(6)
    console.log("Contract deployed in block:", receipt.blockNumber)

    console.log("Verifying contract on Etherscan...")
    try {
      await hre.run("verify:verify", {
        address: contractAddress,
        constructorArguments: [],
      })
      console.log("Contract verified successfully!")
    } catch (error) {
      console.log("Verification failed:", error.message)
    }
  }

  console.log("\n🎉 Deployment completed successfully!")
  console.log("\nContract Details:")
  console.log("- Address:", contractAddress)
  console.log("- Network:", hre.network.name)
  console.log("- Electoral Commission:", electoralCommission)
  console.log("- Deployer:", deployer.address)

  console.log("\nNext steps:")
  console.log("1. Save your deployer private key securely")
  console.log("2. Use the deployer address for admin access")
  console.log("3. Run setup-demo if needed")
  console.log("4. Deploy frontend to Vercel")
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
