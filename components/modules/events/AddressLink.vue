<script setup>
/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

/** Services */
import { splitAddress } from "@/services/utils"

const props = defineProps({
	/**
	 * Blockchain address to display
	 */
	address: {
		type: String,
		required: true,
	},
	/**
	 * Show full address instead of truncated
	 */
	showFull: {
		type: Boolean,
		default: false,
	},
})
</script>

<template>
	<Tooltip :class="$style.tooltip">
		<NuxtLink :to="`/address/${address}`" @click.stop>
			<Text size="11" weight="500" color="primary" mono>
				{{ showFull ? address : splitAddress(address) }}
			</Text>
		</NuxtLink>
		<template #content>
			{{ address }}
		</template>
	</Tooltip>
</template>

<style module>
.tooltip {
	display: inline-block;
}
</style>
