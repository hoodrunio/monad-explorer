<script setup>
// Wallet connection component using AppKit
import WalletModal from '@/components/WalletModal.vue'

// Props for customization (simplified for AppKit)
const props = defineProps({
	label: {
		type: String,
		default: 'Connect Wallet'
	},
	showBalance: {
		type: [Boolean, Object],
		default: () => ({ smallScreen: false, largeScreen: true })
	},
	size: {
		type: String,
		default: 'md',
		validator: (value) => ['md', 'sm'].includes(value)
	}
})
</script>

<template>
	<WalletModal
		:label="label"
		:show-balance="showBalance"
		:size="size"
	/>
</template>
