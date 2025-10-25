<template>
	<Flex gap="16" :class="$style.wrapper">
		<!-- Tile 1 -->
		<Flex direction="column" gap="12" :class="$style.tile">
			<Flex align="center" gap="8">
				<Skeleton w="14" h="14" r="4" />
				<Skeleton w="90" h="14" r="4" />
			</Flex>
			<Flex gap="6" align="center">
				<Skeleton w="60" h="28" r="6" />
				<Skeleton w="50" h="20" r="4" />
			</Flex>
		</Flex>

		<!-- Tile 2 -->
		<Flex direction="column" gap="12" :class="$style.tile">
			<Flex align="center" gap="8">
				<Skeleton w="14" h="14" r="4" />
				<Skeleton w="90" h="14" r="4" />
			</Flex>
			<Skeleton w="80" h="28" r="6" />
		</Flex>

		<!-- Tile 3 -->
		<Flex direction="column" gap="12" :class="$style.tile">
			<Flex align="center" gap="8">
				<Skeleton w="14" h="14" r="4" />
				<Skeleton w="90" h="14" r="4" />
			</Flex>
			<Skeleton w="80" h="28" r="6" />
		</Flex>
	</Flex>
</template>

<script setup>
import Skeleton from "@/components/Skeleton.vue"
</script>

<style module>
.wrapper {
	display: grid;
	grid-template-columns: repeat(3, 1fr);
	gap: 16px;
}

.tile {
	border-radius: 8px;
	background: var(--card-background);
	padding: 16px 20px;
	min-height: 100px;
}

@media (max-width: 768px) {
	.wrapper {
		grid-template-columns: 1fr;
		gap: 12px;
	}

	.tile {
		padding: 14px 16px;
		min-height: 80px;
	}
}

@media (max-width: 500px) {
	.tile {
		padding: 12px;
		min-height: 70px;
	}
}
</style>
