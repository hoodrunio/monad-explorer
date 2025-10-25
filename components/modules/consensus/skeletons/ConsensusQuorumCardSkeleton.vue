<template>
	<Flex direction="column" gap="16" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between">
			<Flex align="center" gap="8">
				<Skeleton :w="16" :h="16" :r="4" />
				<Skeleton :w="130" :h="16" :r="4" />
			</Flex>
		</Flex>

		<!-- Progress section -->
		<Flex direction="column" gap="16">
			<!-- Progress bar -->
			<Flex direction="column" gap="8">
				<Skeleton w="100%" :h="12" :r="6" />

				<Flex align="center" justify="between">
					<Skeleton :w="80" :h="28" :r="6" />
					<Skeleton :w="100" :h="24" :r="12" />
				</Flex>
			</Flex>

			<!-- Stake display -->
			<Flex direction="column" gap="4">
				<Skeleton :w="160" :h="14" :r="4" />
				<Skeleton :w="200" :h="16" :r="4" />
			</Flex>

			<!-- Peak info -->
			<Flex direction="column" gap="4" :class="$style.peak_info">
				<Skeleton :w="120" :h="14" :r="4" />
				<Skeleton :w="180" :h="14" :r="4" />
			</Flex>
		</Flex>
	</Flex>
</template>

<script setup>
import Skeleton from "@/components/Skeleton.vue"
</script>

<style module>
.wrapper {
	border-radius: 8px;
	background: var(--card-background);
	padding: 20px 24px;
}

.peak_info {
	padding-top: 12px;
	border-top: 1px solid var(--op-5);
}

@media (max-width: 768px) {
	.wrapper {
		padding: 16px;
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 12px;
	}
}
</style>
