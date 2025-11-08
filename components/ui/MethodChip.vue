<template>
	<div :class="[$style.chip, $style[methodColor]]">
		<Icon :name="methodIcon" size="10" :class="$style.icon" />
		<span :class="$style.text">{{ displayName }}</span>
	</div>
</template>

<script setup>
const props = defineProps({
	method: {
		type: String,
		default: "",
	},
})

const methodIcon = computed(() => {
	const method = props.method?.toLowerCase() || ""

	// Special system transactions
	if (method === "syscall reward") {
		return "coins_down"
	}

	// Transaction type specific icons (from transaction_types array)
	if (method === "coin transfer") {
		return "coins"
	}

	if (method === "token transfer") {
		return "coins"
	}

	if (method === "contract call") {
		return "zap"
	}

	if (method === "contract creation") {
		return "upload"
	}

	// Contract creation/deployment
	if (method.includes("create") || method.includes("deploy")) {
		return "upload"
	}

	// Transfers
	if (method.includes("transfer") || method === "transfer") {
		return "coins"
	}

	// Swaps
	if (method.includes("swap")) {
		return "refresh"
	}

	// Approvals
	if (method.includes("approve")) {
		return "select"
	}

	// Mint
	if (method.includes("mint")) {
		return "coins_up"
	}

	// Burn
	if (method.includes("burn")) {
		return "burn"
	}

	// Staking/Delegation
	if (method.includes("stake") || method.includes("delegate")) {
		return "self-delegation"
	}

	// Claim/Withdraw
	if (method.includes("claim") || method.includes("withdraw")) {
		return "coins_down"
	}

	// Price related
	if (method.includes("price")) {
		return "price"
	}

	// Contract calls (default)
	return "zap"
})

const methodColor = computed(() => {
	const method = props.method?.toLowerCase() || ""

	// System transactions - purple/violet
	if (method === "syscall reward") {
		return "purple"
	}

	// Transfers - blue
	if (method === "coin transfer" || method === "token transfer") {
		return "blue"
	}

	// Contract operations - orange
	if (method === "contract call" || method === "contract creation") {
		return "orange"
	}

	// Swaps - green
	if (method.includes("swap")) {
		return "green"
	}

	// Approvals - yellow
	if (method.includes("approve")) {
		return "yellow"
	}

	// Mint - green
	if (method.includes("mint")) {
		return "green"
	}

	// Burn - red
	if (method.includes("burn")) {
		return "red"
	}

	// Staking - purple
	if (method.includes("stake") || method.includes("delegate")) {
		return "purple"
	}

	// Claim/Withdraw - cyan
	if (method.includes("claim") || method.includes("withdraw")) {
		return "cyan"
	}

	// Default - gray
	return "gray"
})

const displayName = computed(() => {
	if (!props.method) return "Unknown"

	// Limit length and capitalize first letter
	const name = props.method.length > 20
		? props.method.substring(0, 20) + "..."
		: props.method

	return name.charAt(0).toUpperCase() + name.slice(1)
})
</script>

<style module>
.chip {
	display: inline-flex;
	align-items: center;
	gap: 6px;
	padding: 4px 10px;
	border-radius: 50px;
	background: var(--method-chip-bg);
	border: 1px solid var(--method-chip-border);
	transition: all 0.2s ease;
	white-space: nowrap;
}

.chip:hover {
	transform: scale(1.02);
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0.9;
}

.text {
	font-size: 11px;
	font-weight: 600;
	letter-spacing: 0.01em;
}

/* Color variants */
.blue {
	background: rgba(59, 130, 246, 0.1);
	border-color: rgba(59, 130, 246, 0.3);
}

.blue .text {
	color: rgb(96, 165, 250);
}

.blue:hover {
	background: rgba(59, 130, 246, 0.15);
	border-color: rgba(59, 130, 246, 0.4);
}

.orange {
	background: rgba(251, 146, 60, 0.1);
	border-color: rgba(251, 146, 60, 0.3);
}

.orange .text {
	color: rgb(251, 146, 60);
}

.orange:hover {
	background: rgba(251, 146, 60, 0.15);
	border-color: rgba(251, 146, 60, 0.4);
}

.green {
	background: rgba(34, 197, 94, 0.1);
	border-color: rgba(34, 197, 94, 0.3);
}

.green .text {
	color: rgb(74, 222, 128);
}

.green:hover {
	background: rgba(34, 197, 94, 0.15);
	border-color: rgba(34, 197, 94, 0.4);
}

.purple {
	background: rgba(168, 85, 247, 0.1);
	border-color: rgba(168, 85, 247, 0.3);
}

.purple .text {
	color: rgb(192, 132, 252);
}

.purple:hover {
	background: rgba(168, 85, 247, 0.15);
	border-color: rgba(168, 85, 247, 0.4);
}

.yellow {
	background: rgba(234, 179, 8, 0.1);
	border-color: rgba(234, 179, 8, 0.3);
}

.yellow .text {
	color: rgb(250, 204, 21);
}

.yellow:hover {
	background: rgba(234, 179, 8, 0.15);
	border-color: rgba(234, 179, 8, 0.4);
}

.red {
	background: rgba(239, 68, 68, 0.1);
	border-color: rgba(239, 68, 68, 0.3);
}

.red .text {
	color: rgb(248, 113, 113);
}

.red:hover {
	background: rgba(239, 68, 68, 0.15);
	border-color: rgba(239, 68, 68, 0.4);
}

.cyan {
	background: rgba(34, 211, 238, 0.1);
	border-color: rgba(34, 211, 238, 0.3);
}

.cyan .text {
	color: rgb(103, 232, 249);
}

.cyan:hover {
	background: rgba(34, 211, 238, 0.15);
	border-color: rgba(34, 211, 238, 0.4);
}

.gray {
	background: var(--method-chip-bg);
	border-color: var(--method-chip-border);
}

.gray .text {
	color: var(--txt-secondary);
}

.gray:hover {
	background: var(--op-08);
	border-color: var(--op-15);
}
</style>
