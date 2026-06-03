require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config(); // Loads your secret keys securely

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.28",
  networks: {
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL, // Reads from .env file
      accounts: process.env.SEPOLIA_PRIVATE_KEY ? [process.env.SEPOLIA_PRIVATE_KEY] : [], 
    },
  },
};
