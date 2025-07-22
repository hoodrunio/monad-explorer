<script setup>
import { useAppStore } from "~/stores/app.store"
import { useCanvasStore } from "~/stores/canvas.store"
import { useNotificationsStore } from "~/stores/notifications.store"
import multisynqService from "~/services/multisynq.js"

const appStore = useAppStore()
const canvasStore = useCanvasStore()
const notificationsStore = useNotificationsStore()

// Get Multisynq API key from runtime config
const config = useRuntimeConfig()

// Page meta
useHead({
	title: "MonadDoodle - Collaborative Pixel Canvas"
})

// Connect to Multisynq and blockchain services
onMounted(async () => {
	// Initialize services
	await initializeServices()
})

const initializeServices = async () => {
	try {
		// Initialize Multisynq with API key from config
		const multisynqApiKey = config.public.MULTISYNQ_API_KEY
		const userId = generateUserId()
		
		notificationsStore.showInfo(
			"Connecting to Multisynq...",
			"Setting up real-time collaboration"
		)

		const multisynqConnected = await multisynqService.initialize(multisynqApiKey, userId)
		
		if (multisynqConnected) {
			canvasStore.setMultisynqConnection(true)
			
			// Set up Multisynq event listeners
			setupMultisynqListeners()
			
			notificationsStore.showSuccess(
				"Multisynq Connected!",
				"Real-time collaboration is now active"
			)
		} else {
			throw new Error("Failed to connect to Multisynq")
		}
		
		notificationsStore.showInfo(
			"Welcome to MonadDoodle!",
			"Connect your wallet to start drawing. Each pixel costs 0.0001 MON."
		)
	} catch (error) {
		console.error("Failed to initialize services:", error)
		notificationsStore.showError(
			"Connection Failed",
			"Failed to connect to collaboration services. You can still draw locally."
		)
	}
}

const generateUserId = () => {
	// Generate a unique user ID for this session
	// Multisynq will handle session persistence and reconnection internally
	return "user_" + Math.random().toString(36).substr(2, 9) + "_" + Date.now()
}

const setupMultisynqListeners = () => {
	// Listen for canvas updates from other users
	multisynqService.on("canvas:updated", (data) => {
		const { x, y, color, viewId } = data
		
		// Update local canvas state
		canvasStore.setPixel(x, y, color, viewId)
		
		// Show notification for other users' pixels (compare with current viewId)
		const currentViewId = multisynqService.getCurrentUserId()
		if (viewId !== currentViewId) {
			const user = canvasStore.connectedUsers.get(viewId)
			const displayName = user?.nickname || `User ${viewId.slice(0, 8)}...`
			notificationsStore.showInfo(
				"Pixel Updated",
				`${displayName} set pixel at (${x}, ${y})`
			)
		}
	})

	// Listen for cursor updates
	multisynqService.on("cursor:updated", (data) => {
		const { viewId, x, y, users } = data
		
		// Update user cursors (excluding current user)
		const currentViewId = multisynqService.getCurrentUserId()
		users.forEach(user => {
			if (user.id !== currentViewId) {
				canvasStore.updateUserCursor(user.id, user.cursor.x, user.cursor.y)
			}
		})
	})

	// Listen for user joined
	multisynqService.on("user:joined", (data) => {
		const { viewId, user, totalUsers } = data
		
		canvasStore.addConnectedUser(user)
		canvasStore.updateNativeUserCount(totalUsers) // Update reactive count
		
		notificationsStore.showUserJoined(user.id, user.address)
	})

	// Listen for user left
	multisynqService.on("user:left", (data) => {
		const { viewId, totalUsers } = data
		
		const user = canvasStore.connectedUsers.get(viewId)
		if (user) {
			notificationsStore.showUserLeft(viewId, user.address)
			canvasStore.removeConnectedUser(viewId)
		}
		
		canvasStore.updateNativeUserCount(totalUsers) // Update reactive count
	})

	// Listen for full canvas state (when joining)
	multisynqService.on("canvas:state", (data) => {
		const { pixels, totalPixelsSet, connectedUsers, totalUsers } = data
		
		// Update local state with server state
		canvasStore.loadCanvasFromData(pixels)
		canvasStore.totalPixelsSet = totalPixelsSet
		
		// Update connected users
		connectedUsers.forEach(user => {
			canvasStore.addConnectedUser(user)
		})
		
		// Update user count from Multisynq's native count (totalUsers) or fallback to connectedUsers length
		const userCount = totalUsers || connectedUsers.length
		canvasStore.updateNativeUserCount(userCount)
		
		notificationsStore.showInfo(
			"Canvas Synchronized",
			`Loaded canvas with ${totalPixelsSet} pixels and ${userCount} users`
		)
	})
}

const connectWallet = async () => {
	try {
		appStore.setLoading(true)
		
		// TODO: Implement real wallet connection
		// For now, simulate connection
		await new Promise(resolve => setTimeout(resolve, 1000))
		
		const mockAddress = "0x1234567890abcdef1234567890abcdef12345678"
		appStore.setWalletConnection(true, mockAddress)
		
		// Keep consistent user ID (don't change it when wallet connects)
		// The user ID should remain the same for session continuity
		
		notificationsStore.showSuccess(
			"Wallet Connected",
			`Connected as ${appStore.shortAddress}`
		)
	} catch (error) {
		console.error("Wallet connection failed:", error)
		notificationsStore.showError(
			"Connection Failed",
			"Failed to connect wallet"
		)
	} finally {
		appStore.setLoading(false)
	}
}

// Handle browser close/refresh properly
const handleBeforeUnload = () => {
	// Leave user from session before page unloads
	if (multisynqService.isConnected) {
		multisynqService.disconnect()
	}
}

onMounted(() => {
	// Add beforeunload listener for proper cleanup
	window.addEventListener('beforeunload', handleBeforeUnload)
})

// Cleanup on unmount
onUnmounted(() => {
	window.removeEventListener('beforeunload', handleBeforeUnload)
	multisynqService.disconnect()
})
</script>

<template>
	<div :class="$style.container">
		<Flex direction="col" align="center" gap="32" wide>
			<!-- Title Section -->
			<Flex direction="col" align="center" gap="8">
				<Text size="32" weight="700" color="primary" align="center">
					Collaborative Pixel Canvas
				</Text>
				<Text size="16" color="secondary" align="center">
					Draw together in real-time • Each pixel costs 0.0001 MON
				</Text>
			</Flex>

			<!-- Main Canvas Area -->
			<div :class="$style.canvasArea">
				<Flex gap="24" align="start">
					<!-- Color Palette -->
					<div :class="$style.colorPalette">
						<Text size="14" weight="600" color="primary">
							Colors
						</Text>
						<div :class="$style.colorGrid">
							<button
								v-for="color in canvasStore.colorPalette"
								:key="color"
								:class="[
									$style.colorButton,
									canvasStore.selectedColor === color && $style.selected
								]"
								:style="{ backgroundColor: color }"
								@click="canvasStore.setSelectedColor(color)"
							/>
						</div>
					</div>

					<!-- Canvas Component -->
					<div :class="$style.canvasContainer">
						<PixelCanvas />
					</div>

					<!-- Tools & Stats -->
					<div :class="$style.sidebar">
						<!-- Tools -->
						<div :class="$style.toolSection">
							<Text size="14" weight="600" color="primary">
								Tools
							</Text>
							<Flex direction="col" gap="8">
								<Button
									:type="canvasStore.currentTool === 'brush' ? 'primary' : 'secondary'"
									size="small"
									wide
									@click="canvasStore.setCurrentTool('brush')"
								>
									🖌️ Brush
								</Button>
								<Button
									:type="canvasStore.currentTool === 'eraser' ? 'primary' : 'secondary'"
									size="small"
									wide
									@click="canvasStore.setCurrentTool('eraser')"
								>
									🧹 Eraser
								</Button>
							</Flex>
						</div>

						<!-- Connection Status -->
						<div :class="$style.connectionSection">
							<Text size="14" weight="600" color="primary">
								Collaboration
							</Text>
							<Flex direction="col" gap="4">
								<Flex justify="between">
									<Text size="12" color="secondary">Multisynq:</Text>
									<Text 
										size="12" 
										:color="canvasStore.isMultisynqConnected ? 'green' : 'red'"
									>
										{{ canvasStore.isMultisynqConnected ? 'Connected' : 'Disconnected' }}
									</Text>
								</Flex>
								<Flex justify="between">
									<Text size="12" color="secondary">Users:</Text>
									<Text size="12" color="primary" tabular>
										{{ canvasStore.getNativeUserCount }}
									</Text>
								</Flex>
							</Flex>
						</div>

						<!-- Stats -->
						<div :class="$style.statsSection">
							<Text size="14" weight="600" color="primary">
								Statistics
							</Text>
							<Flex direction="col" gap="4">
								<Flex justify="between">
									<Text size="12" color="secondary">Pixels Set:</Text>
									<Text size="12" color="primary" tabular>
										{{ canvasStore.getPixelCount }}
									</Text>
								</Flex>
								<Flex justify="between">
									<Text size="12" color="secondary">Gas Used:</Text>
									<Text size="12" color="primary" tabular>
										{{ canvasStore.totalGasUsed.toFixed(6) }} MON
									</Text>
								</Flex>
							</Flex>
						</div>

						<!-- Wallet Connection -->
						<div :class="$style.walletSection">
							<Button
								v-if="!appStore.isConnected"
								type="primary"
								size="medium"
								wide
								:loading="appStore.isLoading"
								@click="connectWallet"
							>
								Connect Wallet
							</Button>
							<Flex v-else direction="col" gap="8">
								<Text size="12" color="secondary">
									Connected as:
								</Text>
								<Text size="12" color="primary" breakAll>
									{{ appStore.shortAddress }}
								</Text>
								<Button
									type="secondary"
									size="small"
									wide
									@click="appStore.setWalletConnection(false)"
								>
									Disconnect
								</Button>
							</Flex>
						</div>
					</div>
				</Flex>
			</div>

			<!-- Connected Users -->
			<div v-if="canvasStore.getNativeUserCount > 0" :class="$style.usersSection">
				<Text size="14" weight="600" color="primary">
					Connected Users ({{ canvasStore.getNativeUserCount }})
				</Text>
				<Flex gap="8" wrap="wrap">
					<div
						v-for="user in canvasStore.getConnectedUsersList"
						:key="user.id"
						:class="$style.userBadge"
					>
						<div
							:class="$style.userColor"
							:style="{ backgroundColor: user.color }"
						/>
						<Text size="12" color="secondary">
							{{ user.nickname || (user.address?.slice(0, 6) + '...' + user.address?.slice(-4)) }}
						</Text>
					</div>
				</Flex>
			</div>
		</Flex>

		<!-- Notifications -->
		<Notifications />
	</div>
</template>

<style module>
.container {
	max-width: 1200px;
	margin: 0 auto;
	padding: 0 16px;
}

.canvasArea {
	width: 100%;
	max-width: 1000px;
}

.colorPalette {
	min-width: 120px;
}

.colorGrid {
	display: grid;
	grid-template-columns: repeat(2, 1fr);
	gap: 8px;
	margin-top: 12px;
}

.colorButton {
	width: 32px;
	height: 32px;
	border: 2px solid var(--op-10);
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.2s ease;
}

.colorButton:hover {
	border-color: var(--op-20);
	transform: scale(1.05);
}

.colorButton.selected {
	border-color: var(--brand);
	border-width: 3px;
}

.canvasContainer {
	flex: 1;
	display: flex;
	justify-content: center;
}

.sidebar {
	min-width: 160px;
	display: flex;
	flex-direction: column;
	gap: 24px;
}

.toolSection,
.connectionSection,
.statsSection,
.walletSection {
	padding: 16px;
	background: var(--card-background);
	border: 1px solid var(--op-10);
	border-radius: 12px;
}

.usersSection {
	width: 100%;
	max-width: 800px;
	padding: 16px;
	background: var(--card-background);
	border: 1px solid var(--op-10);
	border-radius: 12px;
}

.userBadge {
	display: flex;
	align-items: center;
	gap: 6px;
	padding: 4px 8px;
	background: var(--op-5);
	border-radius: 6px;
}

.userColor {
	width: 8px;
	height: 8px;
	border-radius: 50%;
}

@media (max-width: 768px) {
	.canvasArea > div {
		flex-direction: column;
		align-items: center;
		gap: 16px;
	}
	
	.colorPalette,
	.sidebar {
		min-width: auto;
		width: 100%;
		max-width: 400px;
	}
	
	.colorGrid {
		grid-template-columns: repeat(6, 1fr);
	}
}
</style> 