require("@nomiclabs/hardhat-waffle")
module.exports = {
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      chainId: 1337
    },
  mumbai: {
    url: process.env.REACT_APP_ALCHEMY_KEY,
    accounts: [process.env.REACT_APP_ACCOUNT_KEY]
  }
  },
  solidity: {
    version: "0.8.4",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  }
}
