// Monad is an Ethereum-equivalent L1 blockchain
// It uses standard Ethereum addresses (0x...), not Cosmos bech32 addresses
// Reference: https://www.monad.xyz/ - "100% EVM-Compatible"

export const monad = {
	chainId: 143, // Monad mainnet chain ID
	chainName: "Monad Mainnet",
	rpc: "https://rpc1.monad.xyz",
	blockExplorer: "https://monad.hoodscan.io",
	nativeCurrency: {
		name: "MON",
		symbol: "MON",
		decimals: 18,
	},
	features: ["EIP1559"], // Monad supports EIP-1559 gas pricing
}

export const monadTestnet = {
	chainId: 10143, // Monad testnet chain ID  
	chainName: "Monad Testnet",
	rpc: "https://rpc-testnet.monadinfra.com",
	blockExplorer: "https://testnet.monad.hoodscan.io",
	nativeCurrency: {
		name: "MON",
		symbol: "MON", 
		decimals: 18,
	},
	features: ["EIP1559"],
}

// Default export for current network
export const mainnet = monad
