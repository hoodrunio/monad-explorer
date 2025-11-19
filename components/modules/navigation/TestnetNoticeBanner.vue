<script setup>
import { ref, onMounted } from 'vue'
import { isMainnet } from '@/services/utils/general'

const showBanner = ref(false)
const isDismissed = ref(false)

onMounted(() => {
	// Only show on mainnet
	showBanner.value = isMainnet()

	// Check if user has dismissed the banner
	const dismissed = localStorage.getItem('testnet_notice_dismissed')
	if (dismissed === 'true') {
		isDismissed.value = true
	}
})

const dismissBanner = () => {
	isDismissed.value = true
	localStorage.setItem('testnet_notice_dismissed', 'true')
}
</script>

<template>
	<Flex
		v-if="showBanner && !isDismissed"
		align="center"
		justify="between"
		gap="16"
		:class="$style.banner"
	>
		<Flex align="center" gap="12" wide>
			<Icon name="info" size="16" color="primary" />
			<Flex direction="column" gap="4">
				<Text size="13" weight="600" color="primary">
					You're viewing Monad Mainnet
				</Text>
				<Text size="12" weight="500" color="secondary">
					Looking for testnet?
					<a href="https://testnet.monad.hoodscan.io" :class="$style.link">
						Visit testnet.monad.hoodscan.io
					</a>
				</Text>
			</Flex>
		</Flex>

		<Button
			@click="dismissBanner"
			type="tertiary"
			size="mini"
			:class="$style.close_btn"
		>
			<Icon name="close" size="14" color="tertiary" />
		</Button>
	</Flex>
</template>

<style module>
.banner {
	padding: 12px 16px;
	background: rgba(0, 122, 255, 0.08);
	border: 1px solid rgba(0, 122, 255, 0.2);
	border-radius: 8px;
	margin-bottom: 16px;
}

.link {
	color: var(--txt-primary);
	font-weight: 600;
	text-decoration: underline;
	transition: opacity 0.2s ease;
}

.link:hover {
	opacity: 0.8;
}

.close_btn {
	flex-shrink: 0;
}

@media (max-width: 500px) {
	.banner {
		padding: 10px 12px;
		flex-direction: column;
		align-items: flex-start;
	}

	.close_btn {
		align-self: flex-end;
	}
}
</style>
