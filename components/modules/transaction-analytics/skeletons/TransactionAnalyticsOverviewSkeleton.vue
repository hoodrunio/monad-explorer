<script setup>
/** Components */
import Skeleton from "@/components/Skeleton.vue"
</script>

<template>
	<Flex gap="16" :class="$style.grid">
		<Flex
			v-for="i in 6"
			:key="i"
			direction="column"
			justify="between"
			:class="$style.metric_card"
		>
			<!-- Icon and Title Row -->
			<Flex align="center" justify="between" wide>
				<Flex align="center" gap="8">
					<Skeleton w="16" h="16" r="4" />
					<Skeleton w="80" h="12" r="6" />
				</Flex>
			</Flex>

			<!-- Value and Description -->
			<Flex direction="column" gap="4">
				<Skeleton w="120" h="18" r="8" />
				<Skeleton w="90" h="11" r="6" />
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.grid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
	gap: 16px;
	width: 100%;
}

.metric_card {
	min-height: 100px;
	background: var(--card-background);
	border-radius: 12px;
	padding: 16px;
	box-shadow: inset 0 0 0 1px var(--op-3);
}

@media (max-width: 1200px) {
	.grid {
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
	}
}

@media (max-width: 768px) {
	.grid {
		grid-template-columns: repeat(2, 1fr);
	}
	
	.metric_card {
		min-height: 90px;
		padding: 12px;
	}
}

@media (max-width: 480px) {
	.grid {
		grid-template-columns: 1fr;
	}
}
</style> 