<script setup>
/**
 * Verification Badge Component
 *
 * Displays contract verification status with three states:
 * - Fully Verified (green)
 * - Partially Verified (yellow)
 * - Not Verified (orange/warning)
 */

const props = defineProps({
	isVerified: {
		type: Boolean,
		required: true,
	},
	isFullyVerified: {
		type: Boolean,
		default: false,
	},
	size: {
		type: String,
		default: "medium", // small, medium, large
		validator: (value) => ["small", "medium", "large"].includes(value),
	},
	showAnimation: {
		type: Boolean,
		default: true,
	},
})

const badgeConfig = computed(() => {
	if (!props.isVerified) {
		return {
			icon: "warning",
			iconColor: "orange",
			title: "Not Verified",
			subtitle: "Source code unavailable",
			styleClass: "unverified",
		}
	}

	if (props.isFullyVerified) {
		return {
			icon: "shield-check",
			iconColor: "white",
			title: "Verified Contract",
			subtitle: "Exact Match",
			styleClass: "verified",
		}
	}

	return {
		icon: "shield-check",
		iconColor: "white",
		title: "Verified Contract",
		subtitle: "Similar Match",
		styleClass: "partiallyVerified",
	}
})
</script>

<template>
	<Flex
		align="center"
		gap="12"
		:class="[
			$style.badge,
			$style[size],
			$style[badgeConfig.styleClass],
			{ [$style.animated]: showAnimation && isVerified }
		]"
	>
		<!-- Icon -->
		<div :class="[$style.iconWrapper, $style[badgeConfig.styleClass]]">
			<Icon :name="badgeConfig.icon" :size="size === 'small' ? 12 : size === 'large' ? 18 : 14" :color="badgeConfig.iconColor" />
		</div>

		<!-- Text Content -->
		<Flex direction="column" :gap="size === 'small' ? '2' : '4'">
			<Text
				:size="size === 'small' ? '11' : size === 'large' ? '14' : '12'"
				weight="600"
				color="primary"
			>
				{{ badgeConfig.title }}
			</Text>
			<Text
				v-if="size !== 'small'"
				:size="size === 'large' ? '11' : '10'"
				color="secondary"
			>
				{{ badgeConfig.subtitle }}
			</Text>
		</Flex>

		<!-- Verified Checkmark (only for verified states) -->
		<div v-if="isVerified && size !== 'small'" :class="$style.checkmark">
			<Icon name="check" size="10" color="white" />
		</div>
	</Flex>
</template>

<style module>
/* Base Badge Styles */
.badge {
	position: relative;
	padding: 0 16px;
	border-radius: 12px;
	transition: var(--transition-normal);
	overflow: hidden;
}

.badge::before {
	content: '';
	position: absolute;
	inset: 0;
	border-radius: inherit;
	padding: 1px;
	-webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
	-webkit-mask-composite: xor;
	mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
	mask-composite: exclude;
	pointer-events: none;
}

/* Size Variants */
.badge.small {
	height: 36px;
	padding: 0 12px;
}

.badge.medium {
	height: 48px;
	padding: 0 16px;
}

.badge.large {
	height: 56px;
	padding: 0 20px;
}

/* Icon Wrapper */
.iconWrapper {
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	flex-shrink: 0;
	transition: var(--transition-normal);
}

.small .iconWrapper {
	width: 24px;
	height: 24px;
}

.medium .iconWrapper {
	width: 32px;
	height: 32px;
}

.large .iconWrapper {
	width: 40px;
	height: 40px;
}

/* Verified State (Green) */
.badge.verified {
	background: var(--verified-bg);
}

.badge.verified::before {
	background: var(--verified-border);
}

.iconWrapper.verified {
	background: var(--verified-green);
	box-shadow: 0 4px 12px var(--verified-glow);
}

.badge.verified:hover {
	background: rgba(10, 222, 113, 0.15);
}

.badge.verified:hover .iconWrapper {
	box-shadow: 0 6px 16px var(--verified-glow);
	transform: scale(1.05);
}

/* Partially Verified State (Yellow) */
.badge.partiallyVerified {
	background: var(--partially-verified-bg);
}

.badge.partiallyVerified::before {
	background: var(--partially-verified-border);
}

.iconWrapper.partiallyVerified {
	background: var(--partially-verified-yellow);
	box-shadow: 0 4px 12px rgba(230, 197, 37, 0.3);
}

.badge.partiallyVerified:hover {
	background: rgba(230, 197, 37, 0.15);
}

.badge.partiallyVerified:hover .iconWrapper {
	box-shadow: 0 6px 16px rgba(230, 197, 37, 0.4);
	transform: scale(1.05);
}

/* Not Verified State (Orange) */
.badge.unverified {
	background: var(--unverified-bg);
}

.badge.unverified::before {
	background: var(--unverified-border);
}

.iconWrapper.unverified {
	background: transparent;
}

.badge.unverified:hover {
	background: rgba(255, 131, 81, 0.12);
}

/* Checkmark */
.checkmark {
	display: flex;
	align-items: center;
	justify-content: center;
	width: 18px;
	height: 18px;
	background: var(--verified-green);
	border-radius: 50%;
	margin-left: auto;
	box-shadow: 0 2px 6px rgba(10, 222, 113, 0.3);
}

.partiallyVerified .checkmark {
	background: var(--partially-verified-yellow);
	box-shadow: 0 2px 6px rgba(230, 197, 37, 0.3);
}

/* Pulse Animation for Verified Badges */
.badge.animated .iconWrapper {
	animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

@keyframes pulse {
	0%, 100% {
		box-shadow: 0 4px 12px var(--verified-glow);
	}
	50% {
		box-shadow: 0 6px 20px var(--verified-glow);
	}
}

/* Mobile Responsive */
@media (max-width: 768px) {
	.badge {
		padding: 0 12px;
	}

	.badge.medium {
		height: 44px;
	}

	.badge.large {
		height: 52px;
		padding: 0 16px;
	}
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
	.badge.animated .iconWrapper {
		animation: none;
	}

	.badge,
	.iconWrapper,
	.checkmark {
		transition: none;
	}
}
</style>
