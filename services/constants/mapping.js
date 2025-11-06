// EVM Transaction Type Icon Mapping
export const MessageIconMap = {
	"coin_transfer": "arrow-circle-right-up",
	"token_transfer": "arrow-circle-right-up",
	"contract_creation": "code",
	"contract_call": "zap",
	"token_creation": "plus-circle",
}

// EVM Transaction Type Color Mapping
export const MessageColorMap = {
	// Transfer types
	"coin_transfer": "var(--tx-transfer)",
	"coin transfer": "var(--tx-transfer)",
	"token_transfer": "var(--tx-transfer)",
	"token transfer": "var(--tx-transfer)",

	// Contract types
	"contract_creation": "var(--tx-contract-creation)",
	"contract creation": "var(--tx-contract-creation)",
	"contract_call": "var(--tx-contract-call)",
	"contract call": "var(--tx-contract-call)",

	// Token creation
	"token_creation": "var(--tx-token-creation)",
	"token creation": "var(--tx-token-creation)",

	// Default for unknown types
	default: "var(--tx-default)",
}
