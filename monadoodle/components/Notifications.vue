<script setup>
import { useNotificationsStore } from "~/stores/notifications.store"

const notificationsStore = useNotificationsStore()

const getNotificationIcon = (type) => {
	switch (type) {
		case 'success': return '✅'
		case 'error': return '❌'
		case 'warning': return '⚠️'
		case 'info':
		default: return 'ℹ️'
	}
}

const getNotificationTypeClass = (type) => {
	switch (type) {
		case 'success': return 'success'
		case 'error': return 'error'
		case 'warning': return 'warning'
		case 'info':
		default: return 'info'
	}
}

const dismissNotification = (id) => {
	notificationsStore.dismissNotification(id)
}
</script>

<template>
	<div :class="$style.container">
		<TransitionGroup name="notification" tag="div" :class="$style.list">
			<div
				v-for="notification in notificationsStore.recentNotifications"
				:key="notification.id"
				:class="[
					$style.notification,
					$style[getNotificationTypeClass(notification.type)]
				]"
			>
				<Flex align="start" gap="12" wide>
					<!-- Icon -->
					<div :class="$style.icon">
						<Text size="16">
							{{ getNotificationIcon(notification.type) }}
						</Text>
					</div>
					
					<!-- Content -->
					<Flex direction="col" gap="4" wide>
						<Text size="13" weight="600" color="primary">
							{{ notification.title }}
						</Text>
						<Text size="12" color="secondary">
							{{ notification.message }}
						</Text>
					</Flex>
					
					<!-- Dismiss Button -->
					<button
						:class="$style.dismissButton"
						@click="dismissNotification(notification.id)"
					>
						<Text size="14" color="tertiary">×</Text>
					</button>
				</Flex>
			</div>
		</TransitionGroup>
	</div>
</template>

<style module>
.container {
	position: fixed;
	top: 80px;
	right: 16px;
	z-index: 1000;
	pointer-events: none;
}

.list {
	display: flex;
	flex-direction: column;
	gap: 8px;
	max-width: 400px;
}

.notification {
	background: var(--notification-background);
	backdrop-filter: blur(8px);
	border: 1px solid var(--op-10);
	border-radius: 12px;
	padding: 16px;
	max-width: 100%;
	box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
	pointer-events: auto;
	position: relative;
	overflow: hidden;
}

.notification::before {
	content: '';
	position: absolute;
	left: 0;
	top: 0;
	bottom: 0;
	width: 4px;
	background: var(--brand);
}

.notification.success::before {
	background: var(--green);
}

.notification.error::before {
	background: var(--red);
}

.notification.warning::before {
	background: var(--orange);
}

.notification.info::before {
	background: var(--blue);
}

.icon {
	flex-shrink: 0;
	width: 24px;
	height: 24px;
	display: flex;
	align-items: center;
	justify-content: center;
}

.dismissButton {
	background: none;
	border: none;
	cursor: pointer;
	padding: 4px;
	border-radius: 4px;
	transition: background-color 0.2s ease;
	flex-shrink: 0;
}

.dismissButton:hover {
	background: var(--op-10);
}

@media (max-width: 768px) {
	.container {
		top: 60px;
		right: 8px;
		left: 8px;
	}
	
	.list {
		max-width: none;
	}
}

/* Transitions */
.notification-enter-active,
.notification-leave-active {
	transition: all 0.3s ease;
}

.notification-enter-from {
	opacity: 0;
	transform: translateX(100%);
}

.notification-leave-to {
	opacity: 0;
	transform: translateX(100%);
}

.notification-move {
	transition: transform 0.3s ease;
}
</style> 