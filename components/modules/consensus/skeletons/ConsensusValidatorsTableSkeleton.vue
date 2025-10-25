<template>
	<Flex direction="column" gap="16" :class="$style.wrapper">
		<!-- Header with Tabs -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="12">
				<Skeleton w="100" h="32" r="6" />
				<Skeleton w="100" h="32" r="6" />
			</Flex>

			<Flex align="center" gap="8">
				<Skeleton w="80" h="24" r="4" />
				<Skeleton w="80" h="24" r="4" />
			</Flex>
		</Flex>

		<!-- Search -->
		<Skeleton w="100%" h="36" r="6" />

		<!-- Table -->
		<div :class="$style.table_wrapper">
			<table :class="$style.table">
				<thead>
					<tr>
						<th><Skeleton w="80" h="14" r="4" /></th>
						<th><Skeleton w="70" h="14" r="4" /></th>
						<th><Skeleton w="70" h="14" r="4" /></th>
						<th><Skeleton w="60" h="14" r="4" /></th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="i in 8" :key="i">
						<td>
							<Flex align="center" gap="8">
								<Skeleton w="24" h="24" r="50" />
								<Skeleton w="150" h="14" r="4" />
							</Flex>
						</td>
						<td><Skeleton w="100" h="14" r="4" /></td>
						<td><Skeleton w="80" h="14" r="4" /></td>
						<td><Skeleton w="90" h="14" r="4" /></td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		<Flex align="center" justify="center" gap="8" :class="$style.pagination">
			<Skeleton w="32" h="28" r="4" />
			<Skeleton w="32" h="28" r="4" />
			<Skeleton w="80" h="28" r="4" />
			<Skeleton w="32" h="28" r="4" />
			<Skeleton w="32" h="28" r="4" />
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
	padding-bottom: 12px;
	border-bottom: 1px solid var(--op-5);
}

.table_wrapper {
	overflow-x: auto;
}

.table {
	width: 100%;
	border-spacing: 0;
}

.table thead tr th {
	text-align: left;
	padding: 12px 16px;
	white-space: nowrap;
	vertical-align: middle;
}

.table tbody tr td {
	padding: 12px 16px;
	white-space: nowrap;
	vertical-align: middle;
	border-top: 1px solid var(--op-5);
}

.pagination {
	padding-top: 16px;
	border-top: 1px solid var(--op-5);
}

@media (max-width: 768px) {
	.wrapper {
		padding: 16px;
	}

	.table tbody tr td {
		padding: 10px 12px;
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 12px;
	}
}
</style>
