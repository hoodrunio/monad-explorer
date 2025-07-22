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
		this.currentUserId = null
	}

	// Initialize Multisynq
	async initialize(apiKey, userId) {
		this.apiKey = apiKey
		this.currentUserId = userId

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

					// Subscribe to Multisynq built-in view lifecycle events (NATIVE USER TRACKING)
					this.subscribe(this.sessionId, "view-join", "handleViewJoin")
					this.subscribe(this.sessionId, "view-exit", "handleViewExit")

					// Store reference to self in global scope
					if (typeof window !== 'undefined') {
						window.monadDoodleModel = this
					}

					console.log("MonadDoodle Model initialized")
				}

				handlePixelSet(data) {
					const { x, y, color, viewId, timestamp } = data

					if (x >= 0 && x < this.canvasSize && y >= 0 && y < this.canvasSize) {
						this.pixels[y][x] = color
						this.totalPixelsSet++
						
						this.pixelHistory.push({
							x, y, color, viewId, timestamp,
							id: this.random()
						})

						const updateData = {
							x, y, color, viewId,
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
					const { x, y, viewId } = data

					if (this.connectedUsers.has(viewId)) {
						const user = this.connectedUsers.get(viewId)
						user.cursor = { x, y }
						user.lastSeen = this.now()
					}

					this.publish(this.sessionId, "cursorUpdated", {
						viewId, x, y,
						users: Array.from(this.connectedUsers.values())
					})
				}

				// Remove custom user join/leave handlers - using native view-join/view-exit instead

				// Handle Multisynq built-in view lifecycle events (NATIVE USER TRACKING)
				handleViewJoin(viewId) {
					console.log("🔗 User joined:", { viewId, totalUsers: this.viewCount })
					
					// Create user with Multisynq's viewId as the user identifier
					const userColor = this.getUserColor ? this.getUserColor(viewId) : "#18d2a5"
					const userNickname = this.deriveNickname ? this.deriveNickname(viewId) : "Anonymous User"
					
					this.connectedUsers.set(viewId, {
						id: viewId,
						nickname: userNickname,
						color: userColor,
						cursor: { x: 0, y: 0 },
						joinedAt: this.now(),
						lastSeen: this.now()
					})

					// Notify views about user join using NATIVE viewCount
					this.publish(this.sessionId, "userJoined", {
						viewId,
						user: this.connectedUsers.get(viewId),
						totalUsers: this.viewCount // Use Multisynq's native viewCount
					})

					// Send canvas state to new user
					this.publish(this.sessionId, "canvasState", {
						pixels: this.pixels,
						totalPixelsSet: this.totalPixelsSet,
						connectedUsers: Array.from(this.connectedUsers.values())
					})
				}

				handleViewExit(viewId) {
					console.log("🚪 User left:", { viewId, totalUsers: this.viewCount })
					
					if (this.connectedUsers.has(viewId)) {
						this.connectedUsers.delete(viewId)

						// Notify views about user leave using NATIVE viewCount
						this.publish(this.sessionId, "userLeft", {
							viewId,
							totalUsers: this.viewCount // Use Multisynq's native viewCount
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
					console.log("👥 View received userLeft event:", data)
					this.emit("user:left", data)
				}

				onCanvasState(data) {
					this.emit("canvas:state", data)
				}

				setPixel(x, y, color, viewId) {
					const eventData = {
						x, y, color, viewId, // Use viewId instead of userId
						timestamp: Date.now()
					}
					console.log("🎨 View publishing pixelSet event:", eventData)
					this.publish(this.sessionId, "pixelSet", eventData)
				}

				moveCursor(x, y, viewId) {
					this.publish(this.sessionId, "cursorMove", { x, y, viewId }) // Use viewId instead of userId
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
				rejoinLimit: 3, // Allow 3 rejoin attempts after disconnect
				autoSleep: 60000, // Sleep after 60 seconds of inactivity (in milliseconds)
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

			// Use Multisynq's native viewId - no localStorage needed!
			// Multisynq handles reconnection and persistence automatically
			const currentViewId = this.view?.viewId || this.view?.id
			
			// Update current user ID to use Multisynq's native view ID
			this.currentUserId = currentViewId
			console.log("🆔 Using Multisynq native viewId:", currentViewId)
			console.log("📊 Current viewCount:", this.model?.viewCount || "unknown")
			
			// Multisynq handles user tracking automatically via view-join/view-exit events
			// No manual joinUser call needed!

			// Setup browser close detection for proper cleanup
			this.setupBrowserCloseHandling()

			console.log("Joined Multisynq session:", this.sessionName)
		} catch (error) {
			console.error("Failed to join Multisynq session:", error)
			throw error
		}
	}

	// Setup browser close/refresh detection
	setupBrowserCloseHandling() {
		if (typeof window !== 'undefined') {
			// Handle page unload (browser close, refresh, navigation)
			const handleBeforeUnload = () => {
				console.log("🚪 Browser closing, cleaning up user session")
				const userId = this.getCurrentUserId()
				if (this.view && userId) {
					// Immediately notify other users that this user is leaving
					this.view.leaveUser(userId)
				}
			}

			// Add event listeners for various unload scenarios
			window.addEventListener('beforeunload', handleBeforeUnload)
			window.addEventListener('unload', handleBeforeUnload)
			
			// Handle page visibility changes (tab switching, minimize)
			document.addEventListener('visibilitychange', () => {
				if (document.hidden) {
					console.log("🔇 Page hidden, user may be leaving")
					// Optional: You could implement logic here for when page becomes hidden
				} else {
					console.log("👀 Page visible again")
					// Optional: You could implement logic here for when page becomes visible
				}
			})

			// Store cleanup function reference for potential later removal
			this.browserCleanupHandler = handleBeforeUnload
		}
	}

	// Disconnect from session
	disconnect() {
		if (this.session) {
			// Leave as user first to properly clean up user state
			const userId = this.getCurrentUserId()
			if (this.view && userId) {
				console.log("🚪 Leaving user from session:", userId)
				this.view.leaveUser(userId)
			}

			// Clean up browser event listeners
			if (typeof window !== 'undefined' && this.browserCleanupHandler) {
				window.removeEventListener('beforeunload', this.browserCleanupHandler)
				window.removeEventListener('unload', this.browserCleanupHandler)
			}

			// Leave the session itself
			console.log("🚪 Leaving Multisynq session")
			this.session.leave()
			this.session = null
			this.model = null
			this.view = null
			this.isConnected = false
		}
	}

	// Get current user ID from session
	getCurrentUserId() {
		return this.currentUserId
	}

	// Canvas-specific methods using native viewId
	setPixel(x, y, color, viewId) {
		if (this.localMode) {
			// In local mode, just emit to local callbacks
			this.emitFallback("canvas:updated", { x, y, color, viewId })
			return
		}

		if (this.view) {
			const currentViewId = viewId || this.getCurrentUserId()
			this.view.setPixel(x, y, color, currentViewId)
		}
	}

	moveCursor(x, y, viewId) {
		if (this.localMode) {
			// In local mode, do nothing (no collaboration)
			return
		}

		if (this.view) {
			const currentViewId = viewId || this.getCurrentUserId()
			this.view.moveCursor(x, y, currentViewId)
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

	// Multisynq user management utilities
	deriveNickname(userId) {
		// Simple nickname generation based on user ID
		// In production, you might want to use Multisynq's official deriveNickname utility
		const adjectives = ['Swift', 'Bright', 'Calm', 'Bold', 'Quick', 'Smart', 'Cool', 'Wild']
		const nouns = ['Fox', 'Wolf', 'Bear', 'Eagle', 'Tiger', 'Lion', 'Shark', 'Hawk']
		
		const hash = this.simpleHash(userId)
		const adjective = adjectives[hash % adjectives.length]
		const noun = nouns[Math.floor(hash / adjectives.length) % nouns.length]
		
		return `${adjective} ${noun}`
	}
	
	getUserColor(userId) {
		// Generate consistent HSL color based on user ID
		// Implementation similar to Multisynq's getUserColor utility
		const hash = this.simpleHash(userId)
		const hue = hash % 360
		const saturation = 70 + (hash % 30) // 70-100%
		const lightness = 45 + (hash % 20)  // 45-65%
		
		return `hsl(${hue}, ${saturation}%, ${lightness}%)`
	}
	
	simpleHash(str) {
		let hash = 0
		for (let i = 0; i < str.length; i++) {
			const char = str.charCodeAt(i)
			hash = ((hash << 5) - hash) + char
			hash = hash & hash // Convert to 32-bit integer
		}
		return Math.abs(hash)
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

	// Get native Multisynq user count
	getNativeUserCount() {
		if (this.model && typeof this.model.viewCount !== 'undefined') {
			return this.model.viewCount
		}
		return 0
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