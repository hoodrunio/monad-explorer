/**
 * Multisynq Service - Real-time collaboration using Multisynq
 * Following the official Multisynq Model-View architecture
 * Docs: https://docs.multisynq.io/api-reference/introduction
 */

// MonadDoodle Model - Contains all canvas logic and state
class MonadDoodleModel {
	constructor() {
		// Will be set when Multisynq initializes
		this.Multisynq = null
	}

	// Initialize model state and event handlers
	init() {
		// Canvas state
		this.canvasSize = 32
		this.pixels = Array(32).fill().map(() => Array(32).fill("#000000"))
		this.connectedUsers = new Map()
		this.totalPixelsSet = 0
		this.pixelHistory = []

		// Subscribe to canvas events
		this.subscribe(this.sessionId, "pixelSet", this.handlePixelSet.bind(this))
		this.subscribe(this.sessionId, "cursorMove", this.handleCursorMove.bind(this))
		this.subscribe(this.sessionId, "userJoin", this.handleUserJoin.bind(this))
		this.subscribe(this.sessionId, "userLeave", this.handleUserLeave.bind(this))

		console.log("MonadDoodle Model initialized")
	}

	// Handle pixel being set by any user
	handlePixelSet(data) {
		const { x, y, color, userId, timestamp } = data

		// Validate coordinates
		if (x >= 0 && x < this.canvasSize && y >= 0 && y < this.canvasSize) {
			// Update pixel
			this.pixels[y][x] = color

			// Track statistics
			this.totalPixelsSet++
			
			// Add to history
			this.pixelHistory.push({
				x, y, color, userId, timestamp,
				id: this.random() // Deterministic random
			})

			// Notify views of canvas change
			this.publish(this.sessionId, "canvasUpdated", {
				x, y, color, userId,
				pixels: this.pixels,
				totalPixelsSet: this.totalPixelsSet
			})
		}
	}

	// Handle cursor movement
	handleCursorMove(data) {
		const { x, y, userId } = data

		// Update user cursor position
		if (this.connectedUsers.has(userId)) {
			const user = this.connectedUsers.get(userId)
			user.cursor = { x, y }
			user.lastSeen = this.now() // Synchronized time
		}

		// Broadcast cursor update
		this.publish(this.sessionId, "cursorUpdated", {
			userId, x, y,
			users: Array.from(this.connectedUsers.values())
		})
	}

	// Handle user joining
	handleUserJoin(userData) {
		const { userId, address, color } = userData

		this.connectedUsers.set(userId, {
			id: userId,
			address,
			color: color || "#18d2a5",
			cursor: { x: 0, y: 0 },
			joinedAt: this.now(),
			lastSeen: this.now()
		})

		// Notify views
		this.publish(this.sessionId, "userJoined", {
			userId,
			user: this.connectedUsers.get(userId),
			totalUsers: this.connectedUsers.size
		})

		// Send current canvas state to new user
		this.publish(this.sessionId, "canvasState", {
			pixels: this.pixels,
			totalPixelsSet: this.totalPixelsSet,
			connectedUsers: Array.from(this.connectedUsers.values())
		})
	}

	// Handle user leaving
	handleUserLeave(data) {
		const { userId } = data

		if (this.connectedUsers.has(userId)) {
			this.connectedUsers.delete(userId)

			this.publish(this.sessionId, "userLeft", {
				userId,
				totalUsers: this.connectedUsers.size
			})
		}
	}

	// Get current canvas state
	getCanvasState() {
		return {
			pixels: this.pixels,
			totalPixelsSet: this.totalPixelsSet,
			connectedUsers: Array.from(this.connectedUsers.values())
		}
	}
}

// MonadDoodle View - Handles UI updates and user input
class MonadDoodleView {
	constructor(model) {
		this.model = model
		this.callbacks = new Map()

		// Subscribe to model events
		this.subscribe(this.sessionId, "canvasUpdated", this.onCanvasUpdated.bind(this))
		this.subscribe(this.sessionId, "cursorUpdated", this.onCursorUpdated.bind(this))
		this.subscribe(this.sessionId, "userJoined", this.onUserJoined.bind(this))
		this.subscribe(this.sessionId, "userLeft", this.onUserLeft.bind(this))
		this.subscribe(this.sessionId, "canvasState", this.onCanvasState.bind(this))

		console.log("MonadDoodle View initialized")
	}

	// Canvas updated event
	onCanvasUpdated(data) {
		this.emit("canvas:updated", data)
	}

	// Cursor updated event
	onCursorUpdated(data) {
		this.emit("cursor:updated", data)
	}

	// User joined event
	onUserJoined(data) {
		this.emit("user:joined", data)
	}

	// User left event
	onUserLeft(data) {
		this.emit("user:left", data)
	}

	// Full canvas state event
	onCanvasState(data) {
		this.emit("canvas:state", data)
	}

	// Send pixel set event to model
	setPixel(x, y, color, userId) {
		// Publish to model via events (never write directly)
		this.publish(this.sessionId, "pixelSet", {
			x, y, color, userId,
			timestamp: Date.now()
		})
	}

	// Send cursor move event to model
	moveCursor(x, y, userId) {
		this.publish(this.sessionId, "cursorMove", { x, y, userId })
	}

	// Send user join event to model
	joinUser(userData) {
		this.publish(this.sessionId, "userJoin", userData)
	}

	// Send user leave event to model
	leaveUser(userId) {
		this.publish(this.sessionId, "userLeave", { userId })
	}

	// Event system for Vue components
	on(event, callback) {
		if (!this.callbacks.has(event)) {
			this.callbacks.set(event, [])
		}
		this.callbacks.get(event).push(callback)
	}

	off(event, callback) {
		if (this.callbacks.has(event)) {
			const callbacks = this.callbacks.get(event)
			const index = callbacks.indexOf(callback)
			if (index > -1) {
				callbacks.splice(index, 1)
			}
		}
	}

	emit(event, data) {
		if (this.callbacks.has(event)) {
			this.callbacks.get(event).forEach(callback => {
				try {
					callback(data)
				} catch (error) {
					console.error(`Error in ${event} callback:`, error)
				}
			})
		}
	}
}

// Main Multisynq Service
class MultisynqService {
	constructor() {
		this.isConnected = false
		this.session = null
		this.model = null
		this.view = null
		this.Multisynq = null
		this.apiKey = null
		this.appId = "com.monad.doodle"
		this.sessionName = "monadoodle-canvas"
		this.localMode = false
		this.fallbackCallbacks = new Map()
	}

	// Initialize Multisynq
	async initialize(apiKey, userId) {
		this.apiKey = apiKey

		// Check if we have a valid API key
		if (!apiKey || apiKey === "your_multisynq_api_key") {
			console.warn("No valid Multisynq API key provided, running in local mode")
			this.localMode = true
			return false
		}

		try {
			// Load Multisynq from CDN
			if (!window.Multisynq) {
				await this.loadMultisynq()
			}
			this.Multisynq = window.Multisynq

			// Set up Model and View classes
			MonadDoodleModel.prototype = Object.create(this.Multisynq.Model.prototype)
			MonadDoodleModel.prototype.constructor = MonadDoodleModel

			MonadDoodleView.prototype = Object.create(this.Multisynq.View.prototype)
			MonadDoodleView.prototype.constructor = MonadDoodleView

			// Join session
			await this.joinSession(userId)

			console.log("Multisynq initialized successfully")
			return true
		} catch (error) {
			console.error("Failed to initialize Multisynq:", error)
			console.warn("Falling back to local mode")
			this.localMode = true
			return false
		}
	}

	// Load Multisynq script from CDN
	async loadMultisynq() {
		return new Promise((resolve, reject) => {
			const script = document.createElement('script')
			script.src = 'https://cdn.jsdelivr.net/npm/@multisynq/client@latest/bundled/multisynq-client.min.js'
			script.onload = resolve
			script.onerror = () => {
				reject(new Error("Failed to load Multisynq from CDN"))
			}
			document.head.appendChild(script)
			
			// Timeout after 10 seconds
			setTimeout(() => {
				reject(new Error("Multisynq loading timeout"))
			}, 10000)
		})
	}

	// Join Multisynq session
	async joinSession(userId) {
		try {
			this.session = await this.Multisynq.Session.join({
				apiKey: this.apiKey,
				appId: this.appId,
				name: this.sessionName,
				model: MonadDoodleModel,
				view: MonadDoodleView,
				debug: process.env.NODE_ENV === 'development' ? ["session", "events"] : []
			})

			this.model = this.session.model
			this.view = this.session.view
			this.isConnected = true

			// Join as user
			this.view.joinUser({
				userId,
				address: userId,
				color: "#18d2a5"
			})

			console.log("Joined Multisynq session:", this.sessionName)
		} catch (error) {
			console.error("Failed to join Multisynq session:", error)
			throw error
		}
	}

	// Disconnect from session
	disconnect() {
		if (this.session) {
			// Leave as user first
			if (this.view && this.getCurrentUserId()) {
				this.view.leaveUser(this.getCurrentUserId())
			}

			this.session.leave()
			this.session = null
			this.model = null
			this.view = null
			this.isConnected = false
		}
	}

	// Get current user ID (you'll need to implement this based on your app logic)
	getCurrentUserId() {
		// This should return the current user's ID
		// For now, return a placeholder
		return "user_" + Math.random().toString(36).substr(2, 9)
	}

	// Canvas-specific methods
	setPixel(x, y, color, userId) {
		if (this.localMode) {
			// In local mode, just emit to local callbacks
			this.emitFallback("canvas:updated", { x, y, color, userId })
			return
		}

		if (this.view) {
			this.view.setPixel(x, y, color, userId)
		}
	}

	moveCursor(x, y, userId) {
		if (this.localMode) {
			// In local mode, do nothing (no collaboration)
			return
		}

		if (this.view) {
			this.view.moveCursor(x, y, userId)
		}
	}

	// Event listeners
	on(event, callback) {
		if (this.localMode) {
			// Store callbacks for local mode
			if (!this.fallbackCallbacks.has(event)) {
				this.fallbackCallbacks.set(event, [])
			}
			this.fallbackCallbacks.get(event).push(callback)
			return
		}

		if (this.view) {
			this.view.on(event, callback)
		}
	}

	off(event, callback) {
		if (this.localMode) {
			if (this.fallbackCallbacks.has(event)) {
				const callbacks = this.fallbackCallbacks.get(event)
				const index = callbacks.indexOf(callback)
				if (index > -1) {
					callbacks.splice(index, 1)
				}
			}
			return
		}

		if (this.view) {
			this.view.off(event, callback)
		}
	}

	// Emit to fallback callbacks (local mode)
	emitFallback(event, data) {
		if (this.fallbackCallbacks.has(event)) {
			this.fallbackCallbacks.get(event).forEach(callback => {
				try {
					callback(data)
				} catch (error) {
					console.error(`Error in ${event} fallback callback:`, error)
				}
			})
		}
	}

	// Get connection status
	getConnectionStatus() {
		return {
			connected: this.isConnected,
			localMode: this.localMode,
			sessionName: this.sessionName,
			appId: this.appId
		}
	}

	// Get canvas state
	getCanvasState() {
		if (this.model) {
			return this.model.getCanvasState()
		}
		return null
	}
}

// Export singleton instance
export const multisynqService = new MultisynqService()
export default multisynqService 