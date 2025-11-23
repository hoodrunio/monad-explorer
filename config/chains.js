// Monad Network Configuration

// Mainnet Configuration
export const monadMainnet = {
	id: 143, // Monad Mainnet Chain ID
	name: 'Monad Mainnet',
	network: 'monad-mainnet',
	nativeCurrency: {
		decimals: 18,
		name: 'MON',
		symbol: 'MON',
	},
	rpcUrls: {
		public: { http: ['https://rpc1.monad.xyz'] },
		default: { http: ['https://rpc1.monad.xyz'] },
	},
	blockExplorers: {
		default: { name: 'MonadScan', url: 'https://monad.hoodscan.io' },
	},
	testnet: false,
}

// Testnet Configuration
export const monadTestnet = {
	id: 10143, // Monad Testnet-1 Chain ID
	name: 'Monad Testnet-1',
	network: 'monad-testnet-1',
	nativeCurrency: {
		decimals: 18,
		name: 'MON',
		symbol: 'MON',
	},
	rpcUrls: {
		public: { http: ['https://rpc-testnet.monadinfra.com'] },
		default: { http: ['https://rpc-testnet.monadinfra.com'] },
	},
	blockExplorers: {
		default: { name: 'MonadScan', url: 'https://testnet.monad.hoodscan.io' },
	},
	testnet: true,
}

// Staking Contract Constants
export const STAKING_CONFIG = {
	CONTRACT_ADDRESS: '0x0000000000000000000000000000000000001000',
	EPOCH_LENGTH: 50000, // blocks
	EPOCH_DELAY_PERIOD: 5000, // rounds
	WITHDRAWAL_DELAY: 1, // epochs
	ACTIVE_VALSET_SIZE: 200,
	UNIT_BIAS: BigInt('1000000000000000000000000000000000000'), // 1e36
	PAGINATED_RESULTS_SIZE: 100,
}

// Function Selectors for Staking Precompile
export const STAKING_SELECTORS = {
	// State-modifying methods
	addValidator: '0xf145204c',
	delegate: '0x84994fec',
	undelegate: '0x5cf41514',
	compound: '0xb34fea67',
	withdraw: '0xaed2ee73',
	claimRewards: '0xa76e2ca5',
	changeCommission: '0x9bdcc3c8',
	externalReward: '0xe4b3303b',
	
	// View methods
	getValidator: '0x2b6d639a',
	getDelegator: '0x573c1ce0',
	getWithdrawalRequest: '0x56fa2045',
	getConsensusValidatorSet: '0xfb29b729',
	getSnapshotValidatorSet: '0xde66a368',
	getExecutionValidatorSet: '0x7cb074df',
	getDelegations: '0x4fd66050',
	getDelegators: '0xa0843a26',
	getEpoch: '0x757991a8',
	
	// Syscalls (not directly callable)
	syscallOnEpochChange: '0x1d4e9f02',
	syscallReward: '0x791bdcf3',
	syscallSnapshot: '0x157eeb21',
}

// Validator Status Flags
export const VALIDATOR_FLAGS = {
	OK: 0,
	STAKE_TOO_LOW: 1,
	INSUFFICIENT_STAKE: 2,
	INSUFFICIENT_VALIDATOR_STAKE: 3,
}

// Gas Costs (for transaction estimation)
export const GAS_COSTS = {
	addValidator: 505125,
	delegate: 260850,
	undelegate: 147750,
	compound: 285050,
	withdraw: 68675,
	claimRewards: 155375,
	changeCommission: 39475,
	externalReward: 62300,
	getValidator: 97200,
	getDelegator: 184900,
	getWithdrawalRequest: 24300,
	getValidatorSet: 814000,
	getEpoch: 16200,
}
