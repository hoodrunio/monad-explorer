<script setup>
import { useCanvasStore } from "~/stores/canvas.store"
import { useAppStore } from "~/stores/app.store"
import { useNotificationsStore } from "~/stores/notifications.store"

const canvasStore = useCanvasStore()
const appStore = useAppStore()
const notificationsStore = useNotificationsStore()

const canvasRef = ref(null)
const isMouseDown = ref(false)
const lastDrawnPixel = ref({ x: -1, y: -1 })

// Canvas configuration
const PIXEL_SIZE = 16
const CANVAS_SIZE = canvasStore.canvasSize * PIXEL_SIZE
const GRID_COLOR = "var(--canvas-grid)"

onMounted(() => {
	// Initialize canvas drawing
	drawCanvas()
})

// Watch for pixel changes and redraw
watchEffect(() => {
	// Watch the pixels array for changes
	canvasStore.pixels
	drawCanvas()
})

const drawCanvas = () => {
	if (!canvasRef.value) return
	
	const canvas = canvasRef.value
	const ctx = canvas.getContext('2d')
	
	// Clear canvas
	ctx.clearRect(0, 0, CANVAS_SIZE, CANVAS_SIZE)
	
	// Draw pixels
	for (let y = 0; y < canvasStore.canvasSize; y++) {
		for (let x = 0; x < canvasStore.canvasSize; x++) {
			const color = canvasStore.getPixel(x, y)
			if (color && color !== '#000000') {
				ctx.fillStyle = color
				ctx.fillRect(
					x * PIXEL_SIZE,
					y * PIXEL_SIZE,
					PIXEL_SIZE,
					PIXEL_SIZE
				)
			}
		}
	}
	
	// Draw grid
	drawGrid(ctx)
	
	// Draw connected user cursors
	drawUserCursors(ctx)
}

const drawGrid = (ctx) => {
	ctx.strokeStyle = GRID_COLOR
	ctx.lineWidth = 0.5
	
	// Vertical lines
	for (let x = 0; x <= canvasStore.canvasSize; x++) {
		ctx.beginPath()
		ctx.moveTo(x * PIXEL_SIZE, 0)
		ctx.lineTo(x * PIXEL_SIZE, CANVAS_SIZE)
		ctx.stroke()
	}
	
	// Horizontal lines
	for (let y = 0; y <= canvasStore.canvasSize; y++) {
		ctx.beginPath()
		ctx.moveTo(0, y * PIXEL_SIZE)
		ctx.lineTo(CANVAS_SIZE, y * PIXEL_SIZE)
		ctx.stroke()
	}
}

const drawUserCursors = (ctx) => {
	const users = canvasStore.getConnectedUsersList
	
	users.forEach(user => {
		if (user.cursor && user.id !== appStore.currentUser.id) {
			const x = user.cursor.x * PIXEL_SIZE + PIXEL_SIZE / 2
			const y = user.cursor.y * PIXEL_SIZE + PIXEL_SIZE / 2
			
			// Draw cursor circle
			ctx.strokeStyle = user.color
			ctx.fillStyle = user.color
			ctx.lineWidth = 2
			
			ctx.beginPath()
			ctx.arc(x, y, 4, 0, 2 * Math.PI)
			ctx.stroke()
			
			// Draw user indicator
			ctx.fillStyle = user.color
			ctx.beginPath()
			ctx.arc(x, y, 2, 0, 2 * Math.PI)
			ctx.fill()
		}
	})
}

const getPixelCoords = (event) => {
	const canvas = canvasRef.value
	const rect = canvas.getBoundingClientRect()
	const scaleX = canvas.width / rect.width
	const scaleY = canvas.height / rect.height
	
	const x = Math.floor(((event.clientX - rect.left) * scaleX) / PIXEL_SIZE)
	const y = Math.floor(((event.clientY - rect.top) * scaleY) / PIXEL_SIZE)
	
	return { x, y }
}

const handleMouseDown = (event) => {
	if (!appStore.isConnected) {
		notificationsStore.showWarning(
			"Wallet Required",
			"Please connect your wallet to start drawing"
		)
		return
	}
	
	isMouseDown.value = true
	canvasStore.setDrawing(true)
	drawPixel(event)
}

const handleMouseMove = (event) => {
	const { x, y } = getPixelCoords(event)
	
	// Update user cursor position
	appStore.updateUserCursor(x, y)
	
	// Broadcast cursor position to other users
	// TODO: Send cursor position via Multisynq
	
	// Draw if mouse is down
	if (isMouseDown.value) {
		drawPixel(event)
	}
	
	// Redraw to show cursor updates
	drawCanvas()
}

const handleMouseUp = () => {
	isMouseDown.value = false
	canvasStore.setDrawing(false)
	lastDrawnPixel.value = { x: -1, y: -1 }
}

const handleMouseLeave = () => {
	handleMouseUp()
}

const drawPixel = async (event) => {
	const { x, y } = getPixelCoords(event)
	
	// Check bounds
	if (x < 0 || x >= canvasStore.canvasSize || y < 0 || y >= canvasStore.canvasSize) {
		return
	}
	
	// Avoid drawing same pixel repeatedly
	if (lastDrawnPixel.value.x === x && lastDrawnPixel.value.y === y) {
		return
	}
	
	lastDrawnPixel.value = { x, y }
	
	// Determine color based on tool
	const color = canvasStore.currentTool === 'eraser' ? '#000000' : canvasStore.selectedColor
	
	// Don't draw if color is the same
	const currentColor = canvasStore.getPixel(x, y)
	if (currentColor === color) {
		return
	}
	
	try {
		// Set pixel locally first for immediate feedback
		canvasStore.setPixel(x, y, color, appStore.currentUser.id)
		
		// Send to blockchain
		await sendPixelTransaction(x, y, color)
		
		// Broadcast to other users via Multisynq
		// TODO: Send pixel data via Multisynq
		
		// Show notification
		notificationsStore.showPixelDrawn(x, y, color, appStore.currentUser.id)
		
	} catch (error) {
		console.error('Failed to draw pixel:', error)
		
		// Revert pixel on error
		canvasStore.setPixel(x, y, currentColor, null)
		
		notificationsStore.showError(
			"Drawing Failed",
			"Failed to set pixel. Please try again."
		)
	}
}

const sendPixelTransaction = async (x, y, color) => {
	// TODO: Implement actual blockchain transaction
	// For now, simulate transaction
	await new Promise(resolve => setTimeout(resolve, 500))
	
	const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64)
	const gasUsed = 0.0001 // 0.0001 MON
	
	canvasStore.addGasUsed(gasUsed)
	canvasStore.addTransaction({
		id: Date.now().toString(),
		x,
		y,
		color,
		userId: appStore.currentUser.id,
		txHash: mockTxHash
	})
	
	notificationsStore.showTransactionConfirmed(mockTxHash, gasUsed)
}

// Handle canvas resizing
const handleResize = () => {
	nextTick(() => {
		drawCanvas()
	})
}

onMounted(() => {
	window.addEventListener('resize', handleResize)
})

onUnmounted(() => {
	window.removeEventListener('resize', handleResize)
})
</script>

<template>
	<div :class="$style.container">
		<canvas
			ref="canvasRef"
			:width="CANVAS_SIZE"
			:height="CANVAS_SIZE"
			:class="[
				$style.canvas,
				canvasStore.currentTool === 'eraser' && $style.eraser
			]"
			@mousedown="handleMouseDown"
			@mousemove="handleMouseMove"
			@mouseup="handleMouseUp"
			@mouseleave="handleMouseLeave"
		/>
		
		<!-- Canvas overlay for hover effects -->
		<div :class="$style.overlay" />
		
		<!-- Pixel coordinates display -->
		<div v-if="appStore.currentUser.cursor" :class="$style.coordinates">
			<Text size="10" color="tertiary" tabular>
				{{ appStore.currentUser.cursor.x }}, {{ appStore.currentUser.cursor.y }}
			</Text>
		</div>
	</div>
</template>

<style module>
.container {
	position: relative;
	display: inline-block;
	border: 2px solid var(--canvas-border);
	border-radius: 12px;
	overflow: hidden;
	background: var(--canvas-background);
}

.canvas {
	display: block;
	cursor: crosshair;
	image-rendering: pixelated;
	image-rendering: -moz-crisp-edges;
	image-rendering: crisp-edges;
}

.canvas.eraser {
	cursor: url('data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="6" fill="none" stroke="red" stroke-width="2"/></svg>') 8 8, auto;
}

.overlay {
	position: absolute;
	top: 0;
	left: 0;
	right: 0;
	bottom: 0;
	pointer-events: none;
	background: transparent;
}

.coordinates {
	position: absolute;
	top: 4px;
	right: 4px;
	background: var(--tooltip-background);
	padding: 2px 6px;
	border-radius: 4px;
	pointer-events: none;
}

@media (max-width: 768px) {
	.canvas {
		max-width: 100%;
		height: auto;
	}
}
</style> 