<script setup>
import { useConsensusVotes } from "@/composables/useConsensusPolling"
import { formatValidatorName, getRelativeTime, exportToCSV } from "@/services/utils/consensus"
import { shortHex } from "@/services/utils"
import Input from "@/components/ui/Input.vue"
import Button from "@/components/ui/Button.vue"
import ValidatorLogo from "@/components/ValidatorLogo.vue"

const { data: votesData, isLoading, isError } = useConsensusVotes()

const searchTerm = ref("")
const currentPage = ref(1)
const pageSize = 25
const sortColumn = ref("ts")
const sortDirection = ref("desc")

const filteredVotes = computed(() => {
	if (!votesData.value || votesData.value.length === 0) return []

	let filtered = [...votesData.value]

	// Apply search filter
	if (searchTerm.value.trim()) {
		const search = searchTerm.value.toLowerCase().trim()
		filtered = filtered.filter((vote) => {
			const name = formatValidatorName(vote.validator_name, vote.author).toLowerCase()
			const provider = (vote.provider || "").toLowerCase()
			const location = (vote.location || "").toLowerCase()
			const author = (vote.author || "").toLowerCase()

			return (
				name.includes(search) ||
				provider.includes(search) ||
				location.includes(search) ||
				author.includes(search)
			)
		})
	}

	// Apply sorting
	filtered.sort((a, b) => {
		let valueA, valueB

		switch (sortColumn.value) {
			case "validator_name":
				valueA = formatValidatorName(a.validator_name, a.author)
				valueB = formatValidatorName(b.validator_name, b.author)
				break
			case "ts":
				valueA = new Date(a.ts).getTime()
				valueB = new Date(b.ts).getTime()
				break
			default:
				return 0
		}

		if (typeof valueA === "string") {
			return sortDirection.value === "asc"
				? valueA.localeCompare(valueB)
				: valueB.localeCompare(valueA)
		}

		return sortDirection.value === "asc" ? valueA - valueB : valueB - valueA
	})

	return filtered
})

const paginatedVotes = computed(() => {
	const start = (currentPage.value - 1) * pageSize
	const end = start + pageSize
	return filteredVotes.value.slice(start, end)
})

const totalPages = computed(() => {
	return Math.ceil(filteredVotes.value.length / pageSize)
})

const handleSort = (column) => {
	if (sortColumn.value === column) {
		sortDirection.value = sortDirection.value === "asc" ? "desc" : "asc"
	} else {
		sortColumn.value = column
		sortDirection.value = "desc"
	}
}

const copyToClipboard = async (text) => {
	try {
		await navigator.clipboard.writeText(text)
	} catch (err) {
		console.error("Failed to copy:", err)
	}
}

const handleExportCSV = () => {
	const columns = [
		{ key: "validator_name", label: "Validator" },
		{ key: "provider", label: "Provider" },
		{ key: "location", label: "Location" },
		{ key: "author", label: "Author" },
		{ key: "sig", label: "Signature" },
		{ key: "ts", label: "Timestamp" },
	]

	const exportData = filteredVotes.value.map((vote) => ({
		validator_name: formatValidatorName(vote.validator_name, vote.author),
		provider: vote.provider || "Unknown",
		location: vote.location || "Unknown",
		author: vote.author || "",
		sig: vote.sig || "",
		ts: vote.ts || "",
	}))

	exportToCSV(exportData, columns, "consensus-votes.csv")
}

const clearSearch = () => {
	searchTerm.value = ""
	currentPage.value = 1
}

watch(searchTerm, () => {
	currentPage.value = 1
})
</script>

<template>
	<Flex direction="column" gap="16" :class="$style.wrapper">
		<!-- Header -->
		<Flex align="center" justify="between" :class="$style.header">
			<Flex align="center" gap="8">
				<Icon name="check" size="16" color="secondary" />
				<Text size="14" weight="600" color="primary">
					Who Signed?
				</Text>
				<Flex v-if="!isLoading && filteredVotes.length > 0" :class="$style.count_chip">
					<Text size="11" weight="600" color="primary">
						{{ filteredVotes.length }}
					</Text>
				</Flex>
			</Flex>

			<Flex align="center" gap="12">
				<!-- Search -->
				<div :class="$style.search_wrapper">
					<Input
						v-model="searchTerm"
						placeholder="Search..."
						icon="search"
						size="small"
						:class="$style.search_input"
					/>
					<button v-if="searchTerm" @click="clearSearch" :class="$style.clear_button" type="button">
						<Icon name="close" size="10" color="tertiary" />
					</button>
				</div>

				<!-- Export CSV -->
				<Button
					v-if="!isLoading && filteredVotes.length > 0"
					type="secondary"
					size="mini"
					@click="handleExportCSV"
				>
					<Icon name="download" size="12" color="secondary" />
					Export CSV
				</Button>
			</Flex>
		</Flex>

		<!-- Loading state -->
		<Flex v-if="isLoading" justify="center" :class="$style.loading">
			<Text size="12" weight="500" color="tertiary">
				Loading votes data...
			</Text>
		</Flex>

		<!-- Error state -->
		<Flex v-else-if="isError" align="center" gap="8" :class="$style.error">
			<Icon name="close" size="14" color="red" />
			<Text size="12" weight="500" color="red">
				Failed to load votes data
			</Text>
		</Flex>

		<!-- Empty state -->
		<Flex v-else-if="filteredVotes.length === 0" direction="column" gap="8" align="center" :class="$style.empty">
			<Text size="13" weight="600" color="secondary">
				{{ searchTerm ? "No votes found" : "No signatures yet for this round" }}
			</Text>
			<Text v-if="searchTerm" size="12" weight="400" color="tertiary">
				Try adjusting your search term
			</Text>
		</Flex>

		<!-- Table -->
		<div v-else :class="$style.table_wrapper">
			<table :class="$style.table">
				<thead>
					<tr>
						<th :class="[$style.sortable]" @click="handleSort('validator_name')">
							<Flex align="center" gap="4">
								<Text size="12" weight="600" color="tertiary" noWrap>Validator</Text>
								<Icon
									name="chevron"
									size="10"
									:color="sortColumn === 'validator_name' ? 'tertiary' : 'support'"
									:style="{
										transform:
											sortColumn === 'validator_name'
												? sortDirection === 'asc'
													? 'rotate(180deg)'
													: 'rotate(0deg)'
												: 'rotate(0deg)',
										opacity: sortColumn === 'validator_name' ? 1 : 0.5,
										transition: 'all 0.2s ease',
									}"
								/>
							</Flex>
						</th>
						<th>
							<Text size="12" weight="600" color="tertiary" noWrap>Provider</Text>
						</th>
						<th>
							<Text size="12" weight="600" color="tertiary" noWrap>Location</Text>
						</th>
						<th>
							<Text size="12" weight="600" color="tertiary" noWrap>Author</Text>
						</th>
						<th>
							<Text size="12" weight="600" color="tertiary" noWrap>Signature</Text>
						</th>
						<th :class="[$style.sortable]" @click="handleSort('ts')">
							<Flex align="center" gap="4">
								<Text size="12" weight="600" color="tertiary" noWrap>Time</Text>
								<Icon
									name="chevron"
									size="10"
									:color="sortColumn === 'ts' ? 'tertiary' : 'support'"
									:style="{
										transform:
											sortColumn === 'ts'
												? sortDirection === 'asc'
													? 'rotate(180deg)'
													: 'rotate(0deg)'
												: 'rotate(0deg)',
										opacity: sortColumn === 'ts' ? 1 : 0.5,
										transition: 'all 0.2s ease',
									}"
								/>
							</Flex>
						</th>
					</tr>
				</thead>
				<tbody>
					<tr v-for="vote in paginatedVotes" :key="vote.author + vote.sig">
						<td>
							<Flex align="center" gap="8">
								<ValidatorLogo
									:logo-url="vote.logoUrl"
									:validator-name="vote.validator_name"
									size="small"
								/>
								<Text
									size="13"
									weight="600"
									:color="vote.validator_name === 'unknown' ? 'tertiary' : 'primary'"
									:class="vote.validator_name === 'unknown' && $style.unknown"
								>
									{{ formatValidatorName(vote.validator_name, vote.author) }}
								</Text>
							</Flex>
						</td>
						<td>
							<Text size="12" color="secondary">
								{{ vote.provider || "Unknown" }}
							</Text>
						</td>
						<td>
							<Text size="12" color="secondary">
								{{ vote.location || "Unknown" }}
							</Text>
						</td>
						<td>
							<Flex align="center" gap="6">
								<Text size="12" color="tertiary" mono>
									{{ shortHex(vote.author) }}
								</Text>
								<button @click="copyToClipboard(vote.author)" :class="$style.copy_btn">
									<Icon name="copy" size="12" color="tertiary" />
								</button>
							</Flex>
						</td>
						<td>
							<Flex align="center" gap="6">
								<Text size="12" color="tertiary" mono>
									{{ shortHex(vote.sig) }}
								</Text>
								<button @click="copyToClipboard(vote.sig)" :class="$style.copy_btn">
									<Icon name="copy" size="12" color="tertiary" />
								</button>
							</Flex>
						</td>
						<td>
							<Text size="12" color="secondary">
								{{ getRelativeTime(vote.ts) }}
							</Text>
						</td>
					</tr>
				</tbody>
			</table>
		</div>

		<!-- Pagination -->
		<Flex v-if="totalPages > 1" align="center" justify="center" gap="8" :class="$style.pagination">
			<Button @click="currentPage = 1" type="secondary" size="mini" :disabled="currentPage === 1">
				<Icon name="arrow-left-stop" size="12" color="primary" />
			</Button>
			<Button @click="currentPage--" type="secondary" size="mini" :disabled="currentPage === 1">
				<Icon name="arrow-left" size="12" color="primary" />
			</Button>

			<Button type="secondary" size="mini" disabled>
				<Text size="12" weight="600" color="primary">{{ currentPage }} of {{ totalPages }}</Text>
			</Button>

			<Button @click="currentPage++" type="secondary" size="mini" :disabled="currentPage === totalPages">
				<Icon name="arrow-right" size="12" color="primary" />
			</Button>
			<Button
				@click="currentPage = totalPages"
				type="secondary"
				size="mini"
				:disabled="currentPage === totalPages"
			>
				<Icon name="arrow-right-stop" size="12" color="primary" />
			</Button>
		</Flex>
	</Flex>
</template>

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

.count_chip {
	padding: 2px 8px;
	border-radius: 10px;
	background: var(--op-5);
}

.search_wrapper {
	position: relative;
	display: flex;
	align-items: center;
	flex-shrink: 0;
}

.search_input {
	min-width: 180px;
}

.clear_button {
	position: absolute;
	right: 8px;
	z-index: 2;
	padding: 0;
	border: none;
	background: transparent;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	width: 16px;
	height: 16px;
	border-radius: 50%;
	transition: background-color 0.2s ease;
}

.clear_button:hover {
	background-color: var(--op-5);
}

.loading,
.empty {
	padding: 32px 16px;
}

.error {
	padding: 16px;
	border-radius: 6px;
	background: rgba(239, 68, 68, 0.1);
	border: 1px solid rgba(239, 68, 68, 0.3);
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

.table tbody tr:hover {
	background: var(--op-5);
}

.sortable {
	cursor: pointer;
	user-select: none;
}

.sortable:hover span {
	color: var(--txt-secondary);
}

.sortable:hover svg {
	opacity: 1 !important;
	color: var(--txt-secondary) !important;
}

.unknown {
	font-style: italic;
}

.copy_btn {
	padding: 4px;
	border: none;
	background: transparent;
	cursor: pointer;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 4px;
	transition: background-color 0.2s ease;
}

.copy_btn:hover {
	background-color: var(--op-5);
}

.pagination {
	padding-top: 16px;
	border-top: 1px solid var(--op-5);
}

@media (max-width: 768px) {
	.wrapper {
		padding: 16px;
	}

	.header {
		flex-direction: column;
		align-items: flex-start;
		gap: 12px;
	}

	.table tbody tr td {
		padding: 10px 12px;
	}
}

@media (max-width: 500px) {
	.wrapper {
		padding: 12px;
	}

	.search_input {
		min-width: 120px;
	}
}
</style>
