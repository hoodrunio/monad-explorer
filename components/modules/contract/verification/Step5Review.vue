<script setup>
/** Components */
import Button from "@/components/ui/Button.vue"
import Badge from "@/components/ui/Badge.vue"
import ConfirmDialog from "@/components/ui/ConfirmDialog.vue"

/** Store */
import { useVerificationStore } from "@/store/verification.store"

/** API */
import {
	verifySolidityFlattened,
	verifySolidityMultiPart,
	verifySolidityStandardJson,
	verifyVyperFlattened,
	verifyVyperMultiPart,
	verifySourcify,
	parseVerificationError,
	formatMatchType
} from "@/services/api/verifier"

/** Services */
import { splitAddress } from "@/services/utils"

const verificationStore = useVerificationStore()

const isSubmitting = ref(false)
const showResetDialog = ref(false)

const verificationSummary = computed(() => {
	return {
		address: verificationStore.contractAddress,
		method: verificationStore.verificationMethod,
		bytecodeType: verificationStore.bytecodeType,
		compiler: verificationStore.compilerVersion,
		evmVersion: verificationStore.evmVersion,
		optimization: verificationStore.optimizationEnabled,
		optimizationRuns: verificationStore.optimizationRuns,
		sourceFilesCount: Object.keys(verificationStore.sourceFiles).length,
		librariesCount: Object.keys(verificationStore.libraries).length,
		hasConstructorArgs: !!verificationStore.constructorArguments
	}
})

const handleVerify = async () => {
	isSubmitting.value = true
	verificationStore.startVerification()

	try {
		let result

		// Base verification data with new API format (snake_case)
		const contractAddress = verificationStore.contractAddress
		const baseData = {
			compilerVersion: verificationStore.compilerVersion,
			licenseType: verificationStore.licenseType,
			evmVersion: verificationStore.evmVersion,
			optimizationRuns: verificationStore.optimizationEnabled ? verificationStore.optimizationRuns : null,
			constructorArgs: verificationStore.constructorArguments || undefined,
			autodetectConstructorArgs: verificationStore.autodetectConstructorArgs
		}

		if (verificationStore.verificationMethod === 'solidity-flattened') {
			// Get first source file for flattened
			const firstFileName = Object.keys(verificationStore.sourceFiles)[0]
			const sourceCode = verificationStore.sourceFiles[firstFileName]
			const contractName = firstFileName.replace('.sol', '')

			result = await verifySolidityFlattened(contractAddress, {
				...baseData,
				sourceCode: sourceCode,
				contractName: contractName,
				libraries: verificationStore.libraries
			})
		} else if (verificationStore.verificationMethod === 'solidity-multi-part') {
			result = await verifySolidityMultiPart(contractAddress, {
				...baseData,
				sourceFiles: verificationStore.sourceFiles,
				libraries: verificationStore.libraries
			})
		} else if (verificationStore.verificationMethod === 'solidity-standard-json') {
			// For standard JSON, we need to extract contract name
			const firstFileName = Object.keys(verificationStore.sourceFiles)[0] || 'Contract'
			const contractName = firstFileName.replace('.sol', '')

			result = await verifySolidityStandardJson(contractAddress, {
				...baseData,
				contractName: contractName,
				input: verificationStore.standardJsonInput
			})
		} else if (verificationStore.verificationMethod === 'vyper-flattened') {
			// Get first source file for flattened
			const firstFileName = Object.keys(verificationStore.sourceFiles)[0]
			const sourceCode = verificationStore.sourceFiles[firstFileName]
			const contractName = firstFileName.replace('.vy', '')

			result = await verifyVyperFlattened(contractAddress, {
				...baseData,
				sourceCode: sourceCode,
				contractName: contractName,
				interfaces: verificationStore.interfaces
			})
		} else if (verificationStore.verificationMethod === 'vyper-multi-part') {
			result = await verifyVyperMultiPart(contractAddress, {
				...baseData,
				sourceFiles: verificationStore.sourceFiles,
				interfaces: verificationStore.interfaces
			})
		} else if (verificationStore.verificationMethod === 'sourcify') {
			result = await verifySourcify(contractAddress, {
				files: verificationStore.sourceFiles
			})
		}

		verificationStore.setVerificationResult(result)
	} catch (error) {
		const errorMessage = parseVerificationError(error)
		verificationStore.setVerificationError(errorMessage)
	} finally {
		isSubmitting.value = false
	}
}

const matchTypeInfo = computed(() => {
	if (!verificationStore.matchType) return null
	return formatMatchType(verificationStore.matchType)
})

const handleVerifyAnother = () => {
	showResetDialog.value = true
}

const confirmReset = () => {
	verificationStore.resetForm()
	showResetDialog.value = false
}

const cancelReset = () => {
	showResetDialog.value = false
}
</script>

<template>
	<Flex direction="column" gap="24" :class="$style.container">
		<!-- Verification Result -->
		<Flex v-if="verificationStore.hasVerificationResult" direction="column" gap="20">
			<!-- Success -->
			<Flex
				v-if="verificationStore.isVerificationSuccess"
				direction="column"
				gap="16"
				:class="$style.successCard"
			>
				<Flex align="center" gap="12">
					<div :class="$style.successIcon">
						<Icon name="check" size="24" color="white" />
					</div>
					<Flex direction="column" gap="4">
						<Text size="16" weight="600" color="primary">Verification Successful!</Text>
						<Text size="12" color="secondary">
							Your contract has been successfully verified
						</Text>
					</Flex>
				</Flex>

				<!-- Match Type -->
				<Flex v-if="matchTypeInfo" align="center" justify="between" :class="$style.matchTypeCard">
					<Flex direction="column" gap="4">
						<Text size="12" weight="600" color="secondary">Match Type</Text>
						<Text size="11" color="tertiary">{{ matchTypeInfo.description }}</Text>
					</Flex>
					<Badge :type="matchTypeInfo.type === 'success' ? 'green' : 'orange'">
						{{ matchTypeInfo.label }}
					</Badge>
				</Flex>

				<!-- Contract Details -->
				<Flex direction="column" gap="12" :class="$style.detailsCard">
					<Text size="12" weight="600" color="secondary">Verified Contract Details</Text>

					<Flex direction="column" gap="8">
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Contract Name</Text>
							<Text size="11" weight="600" color="primary" family="mono">
								{{ verificationStore.verificationResult?.source?.contractName || 'N/A' }}
							</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">File Name</Text>
							<Text size="11" weight="600" color="primary" family="mono">
								{{ verificationStore.verificationResult?.source?.fileName || 'N/A' }}
							</Text>
						</Flex>

						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Compiler</Text>
							<Text size="11" weight="600" color="primary" family="mono">
								{{ verificationStore.verificationResult?.source?.compilerVersion || 'N/A' }}
							</Text>
						</Flex>
					</Flex>
				</Flex>

				<!-- Actions -->
				<Flex align="center" gap="12">
					<Button type="primary" size="medium" wide>
						<Icon name="eye" size="14" color="primary" />
						View Contract
					</Button>
					<Button type="secondary" size="medium" @click="handleVerifyAnother">
						Verify Another
					</Button>
				</Flex>
			</Flex>

			<!-- Error -->
			<Flex
				v-else
				direction="column"
				gap="16"
				:class="$style.errorCard"
			>
				<Flex align="center" gap="12">
					<div :class="$style.errorIcon">
						<Icon name="close" size="24" color="white" />
					</div>
					<Flex direction="column" gap="4">
						<Text size="16" weight="600" color="primary">Verification Failed</Text>
						<Text size="12" color="secondary">
							{{ verificationStore.verificationError || 'An error occurred during verification' }}
						</Text>
					</Flex>
				</Flex>

				<Flex align="center" gap="12">
					<Button type="primary" size="medium" @click="verificationStore.clearVerificationResult">
						<Icon name="arrow-left" size="14" color="primary" />
						Go Back
					</Button>
					<Button type="secondary" size="medium" @click="handleVerify">
						<Icon name="refresh" size="14" color="secondary" />
						Retry
					</Button>
				</Flex>
			</Flex>
		</Flex>

		<!-- Review Summary (before submission) -->
		<Flex v-else direction="column" gap="20">
			<!-- Header -->
			<Flex direction="column" gap="8">
				<Text size="16" weight="600" color="primary">Review & Submit</Text>
				<Text size="13" color="tertiary">
					Review your verification details before submitting
				</Text>
			</Flex>

			<!-- Summary Cards -->
			<div :class="$style.summaryGrid">
				<!-- Contract Info -->
				<Flex direction="column" gap="12" :class="$style.summaryCard">
					<Flex align="center" gap="8">
						<Icon name="contract" size="14" color="brand" />
						<Text size="13" weight="600" color="primary">Contract</Text>
					</Flex>
					<Flex direction="column" gap="6">
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Address</Text>
							<Text size="11" weight="600" color="primary" family="mono">
								{{ splitAddress(verificationSummary.address) }}
							</Text>
						</Flex>
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Bytecode Type</Text>
							<Badge type="blue">{{ verificationSummary.bytecodeType }}</Badge>
						</Flex>
					</Flex>
				</Flex>

				<!-- Compiler Info -->
				<Flex direction="column" gap="12" :class="$style.summaryCard">
					<Flex align="center" gap="8">
						<Icon name="code" size="14" color="brand" />
						<Text size="13" weight="600" color="primary">Compiler</Text>
					</Flex>
					<Flex direction="column" gap="6">
						<Flex direction="column" gap="2">
							<Text size="11" color="tertiary">Version</Text>
							<Text size="11" weight="600" color="primary" family="mono" :class="$style.truncate">
								{{ verificationSummary.compiler }}
							</Text>
						</Flex>
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">EVM Version</Text>
							<Badge type="gray">{{ verificationSummary.evmVersion }}</Badge>
						</Flex>
					</Flex>
				</Flex>

				<!-- Optimization -->
				<Flex direction="column" gap="12" :class="$style.summaryCard">
					<Flex align="center" gap="8">
						<Icon name="zap" size="14" color="brand" />
						<Text size="13" weight="600" color="primary">Optimization</Text>
					</Flex>
					<Flex direction="column" gap="6">
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Enabled</Text>
							<Badge :type="verificationSummary.optimization ? 'green' : 'gray'">
								{{ verificationSummary.optimization ? 'Yes' : 'No' }}
							</Badge>
						</Flex>
						<Flex v-if="verificationSummary.optimization" align="center" justify="between">
							<Text size="11" color="tertiary">Runs</Text>
							<Text size="11" weight="600" color="primary">
								{{ verificationSummary.optimizationRuns }}
							</Text>
						</Flex>
					</Flex>
				</Flex>

				<!-- Source Files -->
				<Flex direction="column" gap="12" :class="$style.summaryCard">
					<Flex align="center" gap="8">
						<Icon name="code" size="14" color="brand" />
						<Text size="13" weight="600" color="primary">Source</Text>
					</Flex>
					<Flex direction="column" gap="6">
						<Flex align="center" justify="between">
							<Text size="11" color="tertiary">Files</Text>
							<Badge type="blue">{{ verificationSummary.sourceFilesCount }}</Badge>
						</Flex>
						<Flex v-if="verificationSummary.librariesCount > 0" align="center" justify="between">
							<Text size="11" color="tertiary">Libraries</Text>
							<Badge type="orange">{{ verificationSummary.librariesCount }}</Badge>
						</Flex>
					</Flex>
				</Flex>
			</div>

			<!-- Validation Messages -->
			<Flex v-if="!verificationStore.isFormValid" direction="column" gap="12" :class="$style.warningCard">
				<Flex align="center" gap="8">
					<Icon name="danger" size="14" color="orange" />
					<Text size="12" weight="600" color="primary">Incomplete Information</Text>
				</Flex>
				<Flex direction="column" gap="6">
					<Text size="11" color="tertiary">
						Please complete the following required fields:
					</Text>
					<Flex direction="column" gap="4" :class="$style.missingFieldsList">
						<Flex
							v-for="field in verificationStore.missingFields"
							:key="field"
							align="center"
							gap="6"
						>
							<Icon name="close-circle" size="12" color="orange" />
							<Text size="11" weight="500" color="secondary">{{ field }}</Text>
						</Flex>
					</Flex>
				</Flex>
			</Flex>

			<!-- Submit Button -->
			<Button
				type="primary"
				size="large"
				wide
				:disabled="!verificationStore.isFormValid || isSubmitting"
				:loading="isSubmitting"
				@click="handleVerify"
			>
				<Icon name="shield-check" size="16" color="primary" />
				{{ isSubmitting ? 'Verifying Contract...' : 'Submit Verification' }}
			</Button>
		</Flex>

		<!-- Reset Confirmation Dialog -->
		<ConfirmDialog
			:show="showResetDialog"
			title="Start New Verification"
			message="Are you sure you want to start a new verification? Current verification data and results will be cleared."
			confirmText="Start New"
			cancelText="Cancel"
			type="warning"
			@confirm="confirmReset"
			@cancel="cancelReset"
		/>
	</Flex>
</template>

<style module>
.container {
	padding: 24px;
	background: var(--card-background);
	border: 1px solid var(--border);
	border-radius: 12px;
}

.successCard {
	padding: 24px;
	background: linear-gradient(135deg, rgba(34, 197, 94, 0.05) 0%, rgba(34, 197, 94, 0.02) 100%);
	border: 2px solid rgba(34, 197, 94, 0.3);
	border-radius: 12px;
}

.successIcon {
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--green);
	border-radius: 50%;
	flex-shrink: 0;
}

.errorCard {
	padding: 24px;
	background: linear-gradient(135deg, rgba(239, 68, 68, 0.05) 0%, rgba(239, 68, 68, 0.02) 100%);
	border: 2px solid rgba(239, 68, 68, 0.3);
	border-radius: 12px;
}

.errorIcon {
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: var(--red);
	border-radius: 50%;
	flex-shrink: 0;
}

.matchTypeCard,
.detailsCard {
	padding: 16px;
	background: var(--card-background);
	border: 1px solid var(--border);
	border-radius: 10px;
}

.summaryGrid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 12px;
}

.summaryCard {
	padding: 16px;
	background: var(--op-3);
	border: 1px solid var(--border);
	border-radius: 10px;
	min-width: 0;
}

.truncate {
	overflow: hidden;
	text-overflow: ellipsis;
	white-space: nowrap;
	max-width: 100%;
}

.warningCard {
	padding: 16px;
	background: rgba(251, 146, 60, 0.05);
	border: 1px solid rgba(251, 146, 60, 0.3);
	border-radius: 10px;
}

.missingFieldsList {
	padding-left: 8px;
	margin-top: 4px;
}

@media (max-width: 1024px) {
	.summaryGrid {
		grid-template-columns: repeat(2, 1fr);
	}
}

@media (max-width: 768px) {
	.container {
		padding: 16px;
	}

	.summaryGrid {
		grid-template-columns: 1fr;
	}

	.successCard,
	.errorCard {
		padding: 16px;
	}

	.successIcon,
	.errorIcon {
		width: 40px;
		height: 40px;
	}
}
</style>
