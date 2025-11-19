<script setup>
import { ref } from 'vue'

/** UI Components */
import Input from '@/components/ui/Input.vue'
import Button from '@/components/ui/Button.vue'

const { login, isLoggingIn, loginError } = useAuth()

const password = ref('')

const handleLogin = async () => {
	await login(password.value)
}

const handleKeyPress = (e) => {
	if (e.key === 'Enter' && !isLoggingIn.value && password.value) {
		handleLogin()
	}
}

definePageMeta({
	layout: false,
})

useHead({
	title: "Monad Explorer - Login Required",
	meta: [
		{
			name: "description",
			content: "Access to Monad Mainnet Explorer",
		},
	],
})
</script>

<template>
	<Flex direction="column" align="center" justify="center" :class="$style.wrapper">
		<Flex direction="column" align="center" gap="32" :class="$style.container">
			<!-- Logo/Title Section -->
			<Flex direction="column" align="center" gap="12">
				<Icon name="logo" size="48" color="primary" />
				<Text size="24" weight="700" color="primary">Monad Explorer</Text>
				<Text size="14" weight="500" color="secondary">Mainnet Access</Text>
			</Flex>

			<!-- Login Form -->
			<Flex direction="column" gap="20" wide>
				<Input
					v-model="password"
					type="password"
					placeholder="Enter password"
					label="Password"
					autofocus
					@keypress="handleKeyPress"
					:class="$style.input"
				/>

				<!-- Error Message -->
				<Flex v-if="loginError" align="center" gap="8" :class="$style.error">
					<Icon name="warning" size="14" color="red" />
					<Text size="13" weight="500" color="red">{{ loginError }}</Text>
				</Flex>

				<!-- Login Button -->
				<Button
					type="primary"
					size="large"
					wide
					:disabled="!password || isLoggingIn"
					:loading="isLoggingIn"
					@click="handleLogin"
				>
					{{ isLoggingIn ? 'Authenticating...' : 'Login' }}
				</Button>
			</Flex>

			<!-- Info Text -->
			<Flex direction="column" align="center" gap="8" :class="$style.info">
				<Text size="12" weight="500" color="tertiary" align="center">
					This is a pre-launch access protected environment.
				</Text>
				<Text size="12" weight="500" color="tertiary" align="center">
					Please contact the Monad team if you need access.
				</Text>
			</Flex>

			<!-- Testnet Link -->
			<Flex direction="column" align="center" gap="8" :class="$style.testnet">
				<Text size="12" weight="500" color="tertiary" align="center">
					Looking for testnet?
				</Text>
				<a href="https://testnet.monad.hoodscan.io" :class="$style.testnet_link">
					<Text size="13" weight="600" color="primary">
						Go to Testnet Explorer →
					</Text>
				</a>
			</Flex>
		</Flex>
	</Flex>
</template>

<style module>
.wrapper {
	width: 100vw;
	height: 100vh;
	background: var(--app-bg);
}

.container {
	width: 100%;
	max-width: 400px;
	padding: 40px;
	border-radius: 12px;
	background: var(--card-bg);
	box-shadow: 0 4px 24px rgba(0, 0, 0, 0.1);
}

.input {
	width: 100%;
}

.error {
	padding: 12px;
	border-radius: 8px;
	background: rgba(255, 59, 48, 0.1);
}

.info {
	padding-top: 12px;
	border-top: 1px solid var(--op-5);
}

.testnet {
	padding: 16px;
	border-radius: 8px;
	background: var(--op-3);
	width: 100%;
}

.testnet_link {
	text-decoration: none;
	transition: opacity 0.2s ease;
}

.testnet_link:hover {
	opacity: 0.8;
}

@media (max-width: 500px) {
	.container {
		max-width: 90%;
		padding: 32px 24px;
	}
}
</style>
