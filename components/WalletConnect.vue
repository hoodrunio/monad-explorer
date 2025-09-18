<script setup>
// Use the new RainbowKit-style connect button
import RainbowConnectButton from '@/components/RainbowConnectButton.vue'

// Props for customization (RainbowKit compatible)
const props = defineProps({
	label: {
		type: String,
		default: 'Connect Wallet'
	},
	accountStatus: {
		type: [String, Object],
		default: 'full'
	},
	chainStatus: {
		type: [String, Object],
		default: () => ({ smallScreen: 'icon', largeScreen: 'full' })
	},
	showBalance: {
		type: [Boolean, Object],
		default: () => ({ smallScreen: false, largeScreen: true })
	}
})
</script>

<template>
	<RainbowConnectButton 
		:label="label"
		:account-status="accountStatus"
		:chain-status="chainStatus"
		:show-balance="showBalance"
	/>
</template>
