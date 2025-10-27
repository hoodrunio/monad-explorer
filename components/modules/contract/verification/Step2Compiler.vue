<script setup>
/** Components */
import Input from "@/components/ui/Input.vue"
import Button from "@/components/ui/Button.vue"
import Spinner from "@/components/ui/Spinner.vue"

/** Store */
import { useVerificationStore } from "@/store/verification.store"

/** API */
import { fetchSolidityVersions, fetchVyperVersions } from "@/services/api/verifier"

const verificationStore = useVerificationStore()

const isLoadingVersions = ref(false)
const versionsError = ref(null)
const searchQuery = ref('')

const isSolidityMethod = computed(() => {
	return verificationStore.verificationMethod.includes('solidity')
})

const isVyperMethod = computed(() => {
	return verificationStore.verificationMethod.includes('vyper')
})

const availableVersions = computed(() => {
	if (isSolidityMethod.value) {
		return verificationStore.solidityVersions
	} else if (isVyperMethod.value) {
		return verificationStore.vyperVersions
	}
	return []
})

const filteredVersions = computed(() => {
	if (!searchQuery.value) {
		return availableVersions.value
	}
	const query = searchQuery.value.toLowerCase()
	return availableVersions.value.filter(version =>
		version.toLowerCase().includes(query)
	)
})

const displayedVersions = computed(() => {
	return filteredVersions.value.slice(0, 50) // Show first 50 results
})

const loadCompilerVersions = async () => {
	isLoadingVersions.value = true
	versionsError.value = null

	try {
		if (isSolidityMethod.value && verificationStore.solidityVersions.length === 0) {
			const { data, error } = await fetchSolidityVersions()
			if (error.value) throw error.value
			if (data.value?.compiler_versions) {
				verificationStore.setSolidityVersions(data.value.compiler_versions)
			}
		} else if (isVyperMethod.value && verificationStore.vyperVersions.length === 0) {
			const { data, error } = await fetchVyperVersions()
			if (error.value) throw error.value
			if (data.value?.compiler_versions) {
				verificationStore.setVyperVersions(data.value.compiler_versions)
			}
		}
	} catch (error) {
		versionsError.value = 'Failed to load compiler versions. Please check your verifier API URL.'
		console.error('Failed to load compiler versions:', error)
	} finally {
		isLoadingVersions.value = false
	}
}

const selectVersion = (version) => {
	verificationStore.setCompilerVersion(version)
}

// Load versions on mount
onMounted(() => {
	loadCompilerVersions()
})

// Reload when method changes
watch(() => verificationStore.verificationMethod, () => {
	loadCompilerVersions()
})
</script>

<template>
	<Flex direction="column" gap="24" :class="$style.container">
		<!-- Header -->
		<Flex direction="column" gap="8">
			<Text size="16" weight="600" color="primary">Compiler Version</Text>
			<Text size="13" color="tertiary">
				Select the {{ isSolidityMethod ? 'Solidity' : 'Vyper' }} compiler version used to compile your contract
			</Text>
		</Flex>

		<!-- Selected Version Display -->
		<Flex v-if="verificationStore.compilerVersion" direction="column" gap="12">
			<Text size="13" weight="600" color="secondary">Selected Version</Text>
			<Flex align="center" gap="12" :class="$style.selectedVersion">
				<Icon name="check-circle" size="16" color="green" />
				<Text size="13" weight="600" color="primary" family="mono">
					{{ verificationStore.compilerVersion }}
				</Text>
				<Button
					type="tertiary"
					size="mini"
					@click="verificationStore.setCompilerVersion('')"
				>
					Change
				</Button>
			</Flex>
		</Flex>

		<!-- Loading State -->
		<Flex v-if="isLoadingVersions" direction="column" align="center" gap="16" :class="$style.loading">
			<Spinner size="32" />
			<Text size="13" color="tertiary">Loading compiler versions...</Text>
		</Flex>

		<!-- Error State -->
		<Flex v-else-if="versionsError" direction="column" gap="12" :class="$style.error">
			<Flex align="center" gap="8">
				<Icon name="alert-circle" size="16" color="red" />
				<Text size="13" weight="600" color="red">{{ versionsError }}</Text>
			</Flex>
			<Button type="secondary" size="small" @click="loadCompilerVersions">
				<Icon name="refresh" size="12" color="secondary" />
				Retry
			</Button>
		</Flex>

		<!-- Version Selector -->
		<Flex v-else-if="!verificationStore.compilerVersion" direction="column" gap="12">
			<!-- Search -->
			<Input
				v-model="searchQuery"
				placeholder="Search compiler versions (e.g., 0.8.20)"
				icon="search"
			/>

			<!-- Version List -->
			<Flex direction="column" gap="8">
				<Flex align="center" justify="between">
					<Text size="12" weight="600" color="secondary">
						Available Versions
					</Text>
					<Text size="11" color="tertiary">
						{{ filteredVersions.length }} versions
						{{ searchQuery ? '(filtered)' : '' }}
					</Text>
				</Flex>

				<div :class="$style.versionList">
					<div
						v-for="version in displayedVersions"
						:key="version"
						:class="$style.versionItem"
						@click="selectVersion(version)"
					>
						<Flex align="center" gap="8">
							<Icon name="code" size="12" color="tertiary" />
							<Text size="12" weight="500" color="primary" family="mono">
								{{ version }}
							</Text>
						</Flex>
						<Icon name="chevron-right" size="12" color="tertiary" />
					</div>
				</div>

				<Text v-if="filteredVersions.length > 50" size="11" color="tertiary" align="center">
					Showing first 50 results. Use search to narrow down.
				</Text>

				<Text v-if="filteredVersions.length === 0" size="12" color="tertiary" align="center" :class="$style.noResults">
					No versions found matching "{{ searchQuery }}"
				</Text>
			</Flex>
		</Flex>

		<!-- Tips -->
		<Flex direction="column" gap="8" :class="$style.tips">
			<Flex align="center" gap="8">
				<Icon name="info" size="14" color="blue" />
				<Text size="12" weight="600" color="primary">Tips</Text>
			</Flex>
			<Flex direction="column" gap="6" :class="$style.tipsList">
				<Text size="11" color="tertiary">
					• The compiler version must exactly match the one used to compile your contract
				</Text>
				<Text size="11" color="tertiary">
					• You can find this in your Hardhat/Foundry config or contract metadata
				</Text>
				<Text size="11" color="tertiary">
					• Most recent contracts use v0.8.x versions
				</Text>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.container {
	padding: 24px;
	background: var(--card-background);
	border: 1px solid var(--border);
	border-radius: 12px;
}

.selectedVersion {
	padding: 16px;
	background: rgba(34, 197, 94, 0.05);
	border: 2px solid var(--green);
	border-radius: 10px;
}

.loading {
	padding: 60px 24px;
}

.error {
	padding: 16px;
	background: rgba(239, 68, 68, 0.05);
	border: 1px solid rgba(239, 68, 68, 0.2);
	border-radius: 10px;
}

.versionList {
	max-height: 400px;
	overflow-y: auto;
	border: 1px solid var(--border);
	border-radius: 8px;
	background: var(--op-3);
}

.versionItem {
	display: flex;
	align-items: center;
	justify-content: space-between;
	padding: 12px 16px;
	cursor: pointer;
	transition: all 0.2s ease;
	border-bottom: 1px solid var(--border);
}

.versionItem:last-child {
	border-bottom: none;
}

.versionItem:hover {
	background: var(--op-8);
}

.versionItem:active {
	background: var(--op-10);
}

.noResults {
	padding: 40px 20px;
}

.tips {
	padding: 16px;
	background: rgba(59, 130, 246, 0.05);
	border: 1px solid rgba(59, 130, 246, 0.2);
	border-radius: 10px;
}

.tipsList {
	margin-left: 22px;
}

/* Custom Scrollbar */
.versionList::-webkit-scrollbar {
	width: 6px;
}

.versionList::-webkit-scrollbar-track {
	background: transparent;
}

.versionList::-webkit-scrollbar-thumb {
	background: var(--op-10);
	border-radius: 3px;
}

.versionList::-webkit-scrollbar-thumb:hover {
	background: var(--op-15);
}

@media (max-width: 768px) {
	.container {
		padding: 16px;
	}

	.versionList {
		max-height: 300px;
	}
}
</style>
