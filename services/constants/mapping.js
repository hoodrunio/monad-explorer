export const MessageIconMap = {
	send: "arrow-circle-right-up",
	multisend: "arrow-circle-right-up",
}

export const MessageColorMap = {
	// Transfer types
	"mon transfer": "var(--tx-mon-transfer)",
	"transfer": "var(--tx-transfer)",
	"send": "var(--tx-transfer)",
	"multisend": "var(--tx-transfer)",
	
	// Contract types
	"contract creation": "var(--tx-contract-creation)",
	"contract call": "var(--tx-contract-call)",
	
	// Default for unknown types
	default: "var(--tx-default)",
}
