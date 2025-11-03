<script setup>
import Modal from "@/components/ui/Modal.vue"
import Button from "@/components/ui/Button.vue"

const props = defineProps({
	show: {
		type: Boolean,
		default: false
	},
	title: {
		type: String,
		default: 'Confirm Action'
	},
	message: {
		type: String,
		default: 'Are you sure you want to continue?'
	},
	confirmText: {
		type: String,
		default: 'Confirm'
	},
	cancelText: {
		type: String,
		default: 'Cancel'
	},
	type: {
		type: String,
		default: 'warning' // 'warning', 'danger', 'info'
	}
})

const emit = defineEmits(['confirm', 'cancel'])

const handleConfirm = () => {
	emit('confirm')
}

const handleCancel = () => {
	emit('cancel')
}
</script>

<template>
	<Modal
		:show="show"
		:width="440"
		@onClose="handleCancel"
	>
		<Flex direction="column" gap="20" :class="$style.dialog">
			<!-- Header -->
			<Flex align="center" gap="12">
				<div :class="[$style.icon, $style[type]]">
					<Icon
						:name="type === 'danger' ? 'danger' : type === 'info' ? 'info' : 'danger'"
						size="20"
						color="white"
					/>
				</div>
				<Text size="16" weight="600" color="primary">{{ title }}</Text>
			</Flex>

			<!-- Message -->
			<Text size="13" color="secondary" :class="$style.message">
				{{ message }}
			</Text>

			<!-- Actions -->
			<Flex align="center" gap="12" justify="end">
				<Button
					type="secondary"
					size="medium"
					@click="handleCancel"
				>
					{{ cancelText }}
				</Button>
				<Button
					:type="type === 'danger' ? 'error' : 'primary'"
					size="medium"
					@click="handleConfirm"
				>
					{{ confirmText }}
				</Button>
			</Flex>
		</Flex>
	</Modal>
</template>

<style module>
.dialog {
	padding: 8px;
}

.icon {
	width: 40px;
	height: 40px;
	min-width: 40px;
	min-height: 40px;
	display: flex;
	align-items: center;
	justify-content: center;
	border-radius: 50%;
	flex-shrink: 0;
}

.icon.warning {
	background: var(--orange);
}

.icon.danger {
	background: var(--red);
}

.icon.info {
	background: var(--blue);
}

.message {
	line-height: 1.6;
}
</style>
