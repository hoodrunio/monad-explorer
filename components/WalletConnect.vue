<script setup>
// Wallet connection modal component
import WalletModal from '@/components/WalletModal.vue'

// Props for customization
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
	<WalletModal
		:label="label"
		:account-status="accountStatus"
		:chain-status="chainStatus"
		:show-balance="showBalance"
	/>
</template>
