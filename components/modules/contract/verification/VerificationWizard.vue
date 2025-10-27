<script setup>
/** Components */
import Button from "@/components/ui/Button.vue"
import Badge from "@/components/ui/Badge.vue"

/** Store */
import { useVerificationStore } from "@/store/verification.store"

const verificationStore = useVerificationStore()

const steps = [
	{ id: 1, title: 'Contract Info', description: 'Basic contract details' },
	{ id: 2, title: 'Compiler', description: 'Select compiler version' },
	{ id: 3, title: 'Settings', description: 'Optimization & EVM version' },
	{ id: 4, title: 'Source Code', description: 'Upload or paste source' },
	{ id: 5, title: 'Verify', description: 'Review and submit' }
]

const getStepStatus = (stepId) => {
	if (stepId < verificationStore.currentStep) return 'completed'
	if (stepId === verificationStore.currentStep) return 'active'
	return 'upcoming'
}

const goToStep = (stepId) => {
	// Only allow going back or to completed steps
	if (stepId < verificationStore.currentStep) {
		verificationStore.setCurrentStep(stepId)
	}
}
</script>

<template>
	<Flex direction="column" gap="24" :class="$style.wizard">
		<!-- Progress Steps -->
		<Flex direction="column" gap="16" :class="$style.stepsContainer">
			<Flex align="center" gap="12" :class="$style.steps">
				<Flex
					v-for="(step, index) in steps"
					:key="step.id"
					align="center"
					gap="12"
					:class="$style.stepWrapper"
				>
					<!-- Step Circle -->
					<Flex
						align="center"
						justify="center"
						:class="[
							$style.stepCircle,
							$style[getStepStatus(step.id)]
						]"
						@click="goToStep(step.id)"
					>
						<Icon
							v-if="getStepStatus(step.id) === 'completed'"
							name="check"
							size="12"
							color="primary"
						/>
						<Text
							v-else
							size="12"
							weight="600"
							:color="getStepStatus(step.id) === 'active' ? 'primary' : 'tertiary'"
						>
							{{ step.id }}
						</Text>
					</Flex>

					<!-- Step Info (Desktop) -->
					<Flex direction="column" gap="2" :class="$style.stepInfo">
						<Text
							size="13"
							weight="600"
							:color="getStepStatus(step.id) === 'active' ? 'primary' : 'secondary'"
						>
							{{ step.title }}
						</Text>
						<Text
							size="11"
							color="tertiary"
							:class="$style.stepDescription"
						>
							{{ step.description }}
						</Text>
					</Flex>

					<!-- Connector Line -->
					<div
						v-if="index < steps.length - 1"
						:class="[
							$style.connector,
							step.id < verificationStore.currentStep && $style.completed
						]"
					/>
				</Flex>
			</Flex>

			<!-- Mobile Progress Bar -->
			<Flex direction="column" gap="8" :class="$style.mobileProgress">
				<Flex align="center" justify="between">
					<Text size="12" weight="600" color="primary">
						{{ steps[verificationStore.currentStep - 1]?.title }}
					</Text>
					<Text size="11" color="tertiary">
						Step {{ verificationStore.currentStep }} of {{ steps.length }}
					</Text>
				</Flex>
				<div :class="$style.progressBar">
					<div
						:class="$style.progressFill"
						:style="{ width: `${(verificationStore.currentStep / steps.length) * 100}%` }"
					/>
				</div>
			</Flex>
		</Flex>

		<!-- Step Content -->
		<div :class="$style.content">
			<slot />
		</div>

		<!-- Navigation Buttons -->
		<Flex align="center" justify="between" :class="$style.navigation">
			<Button
				v-if="verificationStore.currentStep > 1"
				type="secondary"
				size="medium"
				@click="verificationStore.previousStep"
			>
				<Icon name="arrow-left" size="14" color="secondary" />
				Previous
			</Button>
			<div v-else />

			<Flex align="center" gap="12">
				<Button
					type="tertiary"
					size="medium"
					@click="verificationStore.resetForm"
				>
					Reset
				</Button>

				<Button
					v-if="verificationStore.currentStep < 5"
					type="primary"
					size="medium"
					@click="verificationStore.nextStep"
				>
					Next
					<Icon name="arrow-right" size="14" color="primary" />
				</Button>

				<Button
					v-else
					type="primary"
					size="medium"
					:disabled="!verificationStore.isFormValid || verificationStore.isVerifying"
					:loading="verificationStore.isVerifying"
				>
					<Icon name="shield-check" size="14" color="primary" />
					{{ verificationStore.isVerifying ? 'Verifying...' : 'Verify Contract' }}
				</Button>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wizard {
	width: 100%;
}

.stepsContainer {
	padding: 24px;
	background: var(--card-background);
	border: 1px solid var(--border);
	border-radius: 12px;
}

.steps {
	position: relative;
	width: 100%;
}

.stepWrapper {
	position: relative;
	flex: 1;
	cursor: pointer;
	transition: all 0.2s ease;
}

.stepCircle {
	min-width: 36px;
	min-height: 36px;
	width: 36px;
	height: 36px;
	border-radius: 50%;
	background: var(--op-5);
	border: 2px solid var(--border);
	transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
	cursor: pointer;
	z-index: 2;
}

.stepCircle:hover {
	transform: scale(1.05);
}

.stepCircle.completed {
	background: var(--green);
	border-color: var(--green);
	box-shadow: 0 0 0 4px rgba(34, 197, 94, 0.1);
}

.stepCircle.active {
	background: var(--brand);
	border-color: var(--brand);
	box-shadow: 0 0 0 4px rgba(59, 130, 246, 0.15);
	transform: scale(1.1);
}

.stepCircle.upcoming {
	background: var(--op-3);
	border-color: var(--op-10);
}

.stepInfo {
	min-width: 120px;
}

.stepDescription {
	display: block;
}

.connector {
	flex: 1;
	height: 2px;
	background: var(--op-10);
	margin: 0 12px;
	transition: background 0.3s ease;
	position: relative;
	top: -18px;
	z-index: 1;
}

.connector.completed {
	background: var(--green);
}

/* Mobile Progress */
.mobileProgress {
	display: none;
}

.progressBar {
	width: 100%;
	height: 6px;
	background: var(--op-5);
	border-radius: 3px;
	overflow: hidden;
}

.progressFill {
	height: 100%;
	background: linear-gradient(90deg, var(--brand), var(--blue));
	border-radius: 3px;
	transition: width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.content {
	min-height: 400px;
}

.navigation {
	padding: 20px 24px;
	background: var(--card-background);
	border: 1px solid var(--border);
	border-radius: 12px;
}

/* Responsive */
@media (max-width: 1024px) {
	.stepInfo {
		min-width: 100px;
	}

	.stepDescription {
		display: none;
	}
}

@media (max-width: 768px) {
	.steps {
		display: none;
	}

	.mobileProgress {
		display: flex;
	}

	.stepsContainer {
		padding: 16px;
	}

	.navigation {
		padding: 16px;
	}
}
</style>
