// Monad is an Ethereum-equivalent L1 blockchain
// It uses standard Ethereum addresses (0x...), not Cosmos bech32 addresses
// Reference: https://www.monad.xyz/ - "100% EVM-Compatible"

export const monad = {
	chainId: 60808, // Monad mainnet chain ID
	chainName: "Monad Mainnet",
	rpc: "https://rpc.monad.io",
	blockExplorer: "https://explorer.monad.io",
	nativeCurrency: {
		name: "MON",
		symbol: "MON",
		decimals: 18,
	},
	features: ["EIP1559"], // Monad supports EIP-1559 gas pricing
}

export const monadTestnet = {
	chainId: 60809, // Monad testnet chain ID  
	chainName: "Monad Testnet",
	rpc: "https://rpc-testnet.monad.io",
	blockExplorer: "https://testnet.monad.io",
	nativeCurrency: {
		name: "MON",
		symbol: "MON", 
		decimals: 18,
	},
	features: ["EIP1559"],
}

// Default export for current network
export const mainnet = monad
