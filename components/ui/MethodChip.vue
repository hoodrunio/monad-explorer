<template>
	<div :class="$style.chip">
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
	background: var(--op-08);
	border-color: var(--op-15);
}

.icon {
	display: flex;
	align-items: center;
	justify-content: center;
	opacity: 0.8;
}

.text {
	font-size: 11px;
	font-weight: 600;
	color: var(--txt-secondary);
	letter-spacing: 0.01em;
}
</style>
