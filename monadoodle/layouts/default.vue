<script setup>
import { useAppStore } from "~/stores/app.store"
import { useCanvasStore } from "~/stores/canvas.store"
import { useNotificationsStore } from "~/stores/notifications.store"

const appStore = useAppStore()
const canvasStore = useCanvasStore()
const notificationsStore = useNotificationsStore()
</script>

<template>
	<div :class="$style.app">
		<!-- Header -->
		<header :class="$style.header">
			<Flex align="center" justify="between" wide>
				<Flex align="center" gap="12">
					<Text size="20" weight="700" color="brand">
						MonadDoodle
					</Text>
					<Text size="12" color="tertiary">
						v{{ $config.public.version }}
					</Text>
				</Flex>
				
				<Flex align="center" gap="12">
					<!-- Connection Status -->
					<Flex align="center" gap="8">
						<div 
							:class="[
								$style.statusDot, 
								canvasStore.isMultisynqConnected && $style.connected
							]"
						/>
						<Text size="12" color="secondary">
							{{ canvasStore.isMultisynqConnected ? 'Connected' : 'Disconnected' }}
						</Text>
					</Flex>
					
					<!-- User Info -->
					<Flex v-if="appStore.isConnected" align="center" gap="8">
						<Text size="12" color="secondary">
							{{ appStore.shortAddress }}
						</Text>
						<div 
							:class="$style.userColor"
							:style="{ backgroundColor: appStore.currentUser.color }"
						/>
					</Flex>
				</Flex>
			</Flex>
		</header>

		<!-- Main Content -->
		<main :class="$style.main">
			<slot />
		</main>

		<!-- Footer -->
		<footer :class="$style.footer">
			<Flex align="center" justify="center" gap="16">
				<Text size="12" color="tertiary">
					Powered by Monad Blockchain
				</Text>
				<Text size="12" color="tertiary">•</Text>
				<Text size="12" color="tertiary">
					Real-time collaboration with Multisynq
				</Text>
			</Flex>
		</footer>
	</div>
</template>

<style module>
.app {
	min-height: 100vh;
	background: var(--app-background);
	color: var(--txt-primary);
	display: flex;
	flex-direction: column;
}

.header {
	background: var(--card-background);
	border-bottom: 1px solid var(--op-10);
	padding: 16px 24px;
	position: sticky;
	top: 0;
	z-index: 100;
}

.main {
	flex: 1;
	padding: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.footer {
	background: var(--card-background);
	border-top: 1px solid var(--op-10);
	padding: 16px 24px;
}

.statusDot {
	width: 8px;
	height: 8px;
	border-radius: 50%;
	background: var(--red);
	transition: background-color 0.3s ease;
}

.statusDot.connected {
	background: var(--green);
}

.userColor {
	width: 12px;
	height: 12px;
	border-radius: 50%;
	border: 1px solid var(--op-10);
}

@media (max-width: 768px) {
	.header,
	.footer {
		padding: 12px 16px;
	}
	
	.main {
		padding: 16px;
	}
}
</style> 