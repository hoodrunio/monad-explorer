<template>
	<Flex direction="column" gap="12" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<!-- Epoch & Round -->
			<Flex direction="column" gap="4">
				<Skeleton w="80" h="14" r="4" />
				<Flex gap="8" align="center">
					<Skeleton w="120" h="28" r="6" />
					<Skeleton w="100" h="22" r="6" />
				</Flex>
			</Flex>

			<!-- Last update -->
			<Flex direction="column" gap="4" align="end">
				<Skeleton w="70" h="14" r="4" />
				<Skeleton w="90" h="16" r="4" />
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

.header {
	min-height: 60px;
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
