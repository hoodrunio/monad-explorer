<script setup>
/** Components */
import VerificationWizard from "@/components/modules/contract/verification/VerificationWizard.vue"
import Step1ContractInfo from "@/components/modules/contract/verification/Step1ContractInfo.vue"
import Step2Compiler from "@/components/modules/contract/verification/Step2Compiler.vue"
import Step3Settings from "@/components/modules/contract/verification/Step3Settings.vue"
import Step4SourceCode from "@/components/modules/contract/verification/Step4SourceCode.vue"
import Step5Review from "@/components/modules/contract/verification/Step5Review.vue"

/** Store */
import { useVerificationStore } from "@/store/verification.store"

const verificationStore = useVerificationStore()
const route = useRoute()

// Pre-fill contract address from query params
onMounted(() => {
	if (route.query.address) {
		verificationStore.setContractAddress(route.query.address)
	}
})

// SEO
useHead({
	title: 'Verify Contract - Monad Explorer',
	link: [
		{
			rel: "canonical",
			href: "/verify-contract",
		},
	],
	meta: [
		{
			name: "description",
			content: "Verify your smart contract source code on Monad blockchain. Support for Solidity, Vyper, and Sourcify verification methods.",
		},
		{
			property: "og:title",
			content: "Verify Contract - Monad Explorer",
		},
		{
			property: "og:description",
			content: "Verify your smart contract source code on Monad blockchain. Support for Solidity, Vyper, and Sourcify verification methods.",
		},
		{
			property: "og:type",
			content: "website",
		},
	],
})
</script>

<template>
	<Flex direction="column" gap="24" :class="$style.page">
		<!-- Page Header -->
		<Flex direction="column" gap="12" :class="$style.header">
			<Flex align="center" gap="12">
				<div :class="$style.iconWrapper">
					<Icon name="shield-check" size="24" color="brand" />
				</div>
				<Flex direction="column" gap="4">
					<Text size="18" weight="700" color="primary">Contract Verification</Text>
					<Text size="13" color="tertiary">
						Verify and publish your contract source code
					</Text>
				</Flex>
			</Flex>

			<!-- Info Banner -->
			<Flex direction="column" gap="8" :class="$style.infoBanner">
				<Flex align="center" gap="8">
					<Icon name="info" size="14" color="blue" />
					<Text size="12" weight="600" color="primary">Why verify your contract?</Text>
				</Flex>
				<Text size="11" color="tertiary" :class="$style.bannerText">
					Contract verification allows users to review your source code and interact with your contract safely.
					It also enables block explorers to display the contract's ABI and make it easier to interact with.
				</Text>
			</Flex>
		</Flex>

		<!-- Verification Wizard -->
		<VerificationWizard>
			<Step1ContractInfo v-if="verificationStore.currentStep === 1" />
			<Step2Compiler v-else-if="verificationStore.currentStep === 2" />
			<Step3Settings v-else-if="verificationStore.currentStep === 3" />
			<Step4SourceCode v-else-if="verificationStore.currentStep === 4" />
			<Step5Review v-else-if="verificationStore.currentStep === 5" />
		</VerificationWizard>

		<!-- Help Section -->
		<Flex direction="column" gap="16" :class="$style.helpSection">
			<Text size="14" weight="600" color="primary">Need Help?</Text>

			<div :class="$style.helpGrid">
				<Flex direction="column" gap="8" :class="$style.helpCard">
					<Icon name="book" size="16" color="brand" />
					<Text size="12" weight="600" color="primary">Documentation</Text>
					<Text size="11" color="tertiary">
						Learn more about contract verification and best practices
					</Text>
				</Flex>

				<Flex direction="column" gap="8" :class="$style.helpCard">
					<Icon name="message-circle" size="16" color="brand" />
					<Text size="12" weight="600" color="primary">Support</Text>
					<Text size="11" color="tertiary">
						Get help from our community or support team
					</Text>
				</Flex>

				<Flex direction="column" gap="8" :class="$style.helpCard">
					<Icon name="code" size="16" color="brand" />
					<Text size="12" weight="600" color="primary">API</Text>
					<Text size="11" color="tertiary">
						Automate verification using our API
					</Text>
				</Flex>
			</div>
		</Flex>
	</Flex>
</template>

<style module>
.page {
	max-width: 1200px;
	margin: 0 auto;
	padding: 32px 24px;
	width: 100%;
}

.header {
	padding: 24px;
	background: var(--card-background);
	border: 1px solid var(--border);
	border-radius: 12px;
}

.iconWrapper {
	width: 48px;
	height: 48px;
	display: flex;
	align-items: center;
	justify-content: center;
	background: rgba(59, 130, 246, 0.1);
	border-radius: 12px;
}

.infoBanner {
	padding: 16px;
	background: rgba(59, 130, 246, 0.05);
	border: 1px solid rgba(59, 130, 246, 0.2);
	border-radius: 10px;
}

.bannerText {
	line-height: 1.6;
}

.helpSection {
	padding: 24px;
	background: var(--card-background);
	border: 1px solid var(--border);
	border-radius: 12px;
}

.helpGrid {
	display: grid;
	grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
	gap: 16px;
}

.helpCard {
	padding: 20px;
	background: var(--op-3);
	border: 1px solid var(--border);
	border-radius: 10px;
	transition: all 0.2s ease;
	cursor: pointer;
}

.helpCard:hover {
	background: var(--op-5);
	border-color: var(--op-15);
	transform: translateY(-2px);
}

@media (max-width: 768px) {
	.page {
		padding: 16px;
	}

	.header {
		padding: 16px;
	}

	.helpGrid {
		grid-template-columns: 1fr;
	}
}
</style>
