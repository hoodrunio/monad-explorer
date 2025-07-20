/**
 * Multisynq Service - Real-time collaboration using Multisynq
 * Following the official Multisynq Model-View architecture
 * Docs: https://docs.multisynq.io/api-reference/introduction
 */

// Model and View classes will be created dynamically after Multisynq loads
let MonadDoodleModel, MonadDoodleView

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
		this.pendingCallbacks = new Map()
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

			// Set up proper inheritance using class extends pattern
			// Create new classes that properly extend Multisynq classes
			const BaseModel = this.Multisynq.Model
			const BaseView = this.Multisynq.View
			
			// Create proper subclasses
			class ExtendedMonadDoodleModel extends BaseModel {
				static types() {
					return {
						// Using standard JavaScript types - no custom serialization needed
					}
				}

				init(options = {}) {
					// Only call super.init if it exists
					if (super.init && typeof super.init === 'function') {
						super.init(options)
					}
					// Canvas state
					this.canvasSize = 32
					this.pixels = Array(32).fill().map(() => Array(32).fill("#000000"))
					this.connectedUsers = new Map()
					this.totalPixelsSet = 0
					this.pixelHistory = []

					// Subscribe to canvas events
					this.subscribe(this.sessionId, "pixelSet", "handlePixelSet")
					this.subscribe(this.sessionId, "cursorMove", "handleCursorMove")
					this.subscribe(this.sessionId, "userJoin", "handleUserJoin")
					this.subscribe(this.sessionId, "userLeave", "handleUserLeave")

					// Store reference to self in global scope
					if (typeof window !== 'undefined') {
						window.monadDoodleModel = this
					}

					console.log("MonadDoodle Model initialized")
				}

				handlePixelSet(data) {
					const { x, y, color, userId, timestamp } = data

					if (x >= 0 && x < this.canvasSize && y >= 0 && y < this.canvasSize) {
						this.pixels[y][x] = color
						this.totalPixelsSet++
						
						this.pixelHistory.push({
							x, y, color, userId, timestamp,
							id: this.random()
						})

						const updateData = {
							x, y, color, userId,
							pixels: this.pixels,
							totalPixelsSet: this.totalPixelsSet
						}
						
						// Direct View notification via global reference (WORKING SOLUTION)
						try {
							if (typeof window !== 'undefined' && window.monadDoodleView) {
								window.monadDoodleView.onCanvasUpdated(updateData)
							}
						} catch (error) {
							console.error("Error notifying views:", error)
						}
					}
				}

				handleCursorMove(data) {
					const { x, y, userId } = data

					if (this.connectedUsers.has(userId)) {
						const user = this.connectedUsers.get(userId)
						user.cursor = { x, y }
						user.lastSeen = this.now()
					}

					this.publish(this.sessionId, "cursorUpdated", {
						userId, x, y,
						users: Array.from(this.connectedUsers.values())
					})
				}

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

					this.publish(this.sessionId, "userJoined", {
						userId,
						user: this.connectedUsers.get(userId),
						totalUsers: this.connectedUsers.size
					})

					this.publish(this.sessionId, "canvasState", {
						pixels: this.pixels,
						totalPixelsSet: this.totalPixelsSet,
						connectedUsers: Array.from(this.connectedUsers.values())
					})
				}

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

				getCanvasState() {
					return {
						pixels: this.pixels,
						totalPixelsSet: this.totalPixelsSet,
						connectedUsers: Array.from(this.connectedUsers.values())
					}
				}
			}

			class ExtendedMonadDoodleView extends BaseView {
				init(options = {}) {
					// Only call super.init if it exists
					if (super.init && typeof super.init === 'function') {
						super.init(options)
					}
					this.callbacks = new Map()

					this.subscribe(this.sessionId, "canvasUpdated", "onCanvasUpdated")
					this.subscribe(this.sessionId, "cursorUpdated", "onCursorUpdated")
					this.subscribe(this.sessionId, "userJoined", "onUserJoined")
					this.subscribe(this.sessionId, "userLeft", "onUserLeft")
					this.subscribe(this.sessionId, "canvasState", "onCanvasState")

					// Store reference to self in global scope for Model to access
					if (typeof window !== 'undefined') {
						window.monadDoodleView = this
					}

					console.log("MonadDoodle View initialized")
				}

				onCanvasUpdated(data) {
					this.emit("canvas:updated", data)
				}

				onCursorUpdated(data) {
					this.emit("cursor:updated", data)
				}

				onUserJoined(data) {
					console.log("👥 View received userJoined event:", data)
					this.emit("user:joined", data)
				}

				onUserLeft(data) {
					this.emit("user:left", data)
				}

				onCanvasState(data) {
					this.emit("canvas:state", data)
				}

				setPixel(x, y, color, userId) {
					const eventData = {
						x, y, color, userId,
						timestamp: Date.now()
					}
					console.log("🎨 View publishing pixelSet event:", eventData)
					this.publish(this.sessionId, "pixelSet", eventData)
				}

				moveCursor(x, y, userId) {
					this.publish(this.sessionId, "cursorMove", { x, y, userId })
				}

				joinUser(userData) {
					this.publish(this.sessionId, "userJoin", userData)
				}

				leaveUser(userId) {
					this.publish(this.sessionId, "userLeave", { userId })
				}

				on(event, callback) {
					if (!this.callbacks) {
						this.callbacks = new Map()
					}
					if (!this.callbacks.has(event)) {
						this.callbacks.set(event, [])
					}
					this.callbacks.get(event).push(callback)
				}

				off(event, callback) {
					if (this.callbacks && this.callbacks.has(event)) {
						const callbacks = this.callbacks.get(event)
						const index = callbacks.indexOf(callback)
						if (index > -1) {
							callbacks.splice(index, 1)
						}
					}
				}

				emit(event, data) {
					if (this.callbacks && this.callbacks.has(event)) {
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

			// Use the new extended classes
			MonadDoodleModel = ExtendedMonadDoodleModel
			MonadDoodleView = ExtendedMonadDoodleView

			// Register the Model class (Views don't need registration)
			MonadDoodleModel.register("MonadDoodleModel")

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
			// Use fixed session name for all users to ensure they join the same session
			const sessionConfig = {
				apiKey: this.apiKey,
				appId: this.appId,
				name: this.sessionName, // Use fixed session name
				password: "monadoodle-collaboration", // Use fixed password
				model: MonadDoodleModel,
				view: MonadDoodleView,
				//debug: process.env.NODE_ENV === 'development' ? ["session", "events"] : []
			}
			
			console.log("Joining Multisynq session with config:", sessionConfig)
			this.session = await this.Multisynq.Session.join(sessionConfig)

			this.model = this.session.model
			this.view = this.session.view
			this.isConnected = true

			// Ensure View is properly initialized
			if (this.view && typeof this.view.init === 'function') {
				console.log("🔧 Manually initializing View")
				this.view.init()
			}

			// Global references are set up automatically in init() methods

			// Register any pending callbacks
			if (this.pendingCallbacks) {
				console.log("🔄 Registering pending callbacks:", this.pendingCallbacks)
				for (const [event, callbacks] of this.pendingCallbacks.entries()) {
					for (const callback of callbacks) {
						console.log("📝 Registering pending callback for event:", event)
						this.view.on(event, callback)
					}
				}
				this.pendingCallbacks.clear()
			}

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

		console.log("🔌 MultisynqService.on() called for event:", event)
		if (this.view) {
			console.log("🔗 Registering callback with View for event:", event)
			this.view.on(event, callback)
		} else {
			console.warn("⚠️ View not ready, storing callback for later")
			// Store callbacks for when view becomes available
			if (!this.pendingCallbacks) {
				this.pendingCallbacks = new Map()
			}
			if (!this.pendingCallbacks.has(event)) {
				this.pendingCallbacks.set(event, [])
			}
			this.pendingCallbacks.get(event).push(callback)
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