export const ESPOTZ_CONTRACTS = {
  network: "bscTestnet",
  chainId: 97,
  rpcUrl: "https://data-seed-prebsc-1-s1.binance.org:8545",
  blockExplorer: "https://testnet.bscscan.com",

  addresses: {
    USDT: "0x9a4A325c2Ff2aCA74246ef031C8891b2d1096113" as `0x${string}`,
    CollateralVault: "0x9c1C147C35FC910141E18bDEd52A14ac40014c06" as `0x${string}`,
    PredictionMarket: "0xbFac61515177aa5504131FC93643e507785AB165" as `0x${string}`,
    Tournament: "0xaE855c89c23544129f9d0B8E414aCbc9B221dc59" as `0x${string}`,
  },

  deployer: "0xD3dA38C22E29260FA96cccDeb570b9E783c1247b" as `0x${string}`,
} as const;
