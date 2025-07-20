/**
 * Multisynq Service
 * Handles real-time collaboration using Multisynq platform
 */

class MultisynqService {
	constructor() {
		this.apiKey = null
		this.socket = null
		this.roomId = "monadoodle-canvas"
		this.isConnected = false
		this.callbacks = new Map()
		this.userId = null
	}

	// Initialize connection
	async initialize(apiKey, userId) {
		this.apiKey = apiKey
		this.userId = userId
		
		try {
			await this.connect()
			return true
		} catch (error) {
			console.error("Failed to initialize Multisynq:", error)
			return false
		}
	}

	// Connect to Multisynq
	async connect() {
		// For demo purposes, we'll simulate the connection with WebSocket
		// In production, this would use the actual Multisynq SDK
		
		try {
			// Simulate Multisynq connection
			this.socket = new WebSocket('wss://echo.websocket.org')
			
			this.socket.onopen = () => {
				this.isConnected = true
				this.emit('connection', { connected: true })
				console.log('Connected to Multisynq')
				
				// Send initial join message
				this.send('join', {
					roomId: this.roomId,
					userId: this.userId,
					timestamp: Date.now()
				})
			}
			
			this.socket.onmessage = (event) => {
				try {
					const data = JSON.parse(event.data)
					this.handleMessage(data)
				} catch (error) {
					console.error('Failed to parse message:', error)
				}
			}
			
			this.socket.onclose = () => {
				this.isConnected = false
				this.emit('connection', { connected: false })
				console.log('Disconnected from Multisynq')
				
				// Attempt to reconnect after 3 seconds
				setTimeout(() => {
					if (!this.isConnected) {
						this.connect()
					}
				}, 3000)
			}
			
			this.socket.onerror = (error) => {
				console.error('Multisynq connection error:', error)
				this.emit('error', { error })
			}
			
		} catch (error) {
			console.error('Failed to connect to Multisynq:', error)
			throw error
		}
	}

	// Disconnect from Multisynq
	disconnect() {
		if (this.socket) {
			this.socket.close()
			this.socket = null
		}
		this.isConnected = false
	}

	// Send message to other users
	send(type, data) {
		if (!this.isConnected || !this.socket) {
			console.warn('Cannot send message: not connected to Multisynq')
			return false
		}

		try {
			const message = {
				type,
				data,
				userId: this.userId,
				roomId: this.roomId,
				timestamp: Date.now()
			}

			this.socket.send(JSON.stringify(message))
			return true
		} catch (error) {
			console.error('Failed to send message:', error)
			return false
		}
	}

	// Handle incoming messages
	handleMessage(message) {
		const { type, data, userId } = message
		
		// Don't process our own messages
		if (userId === this.userId) {
			return
		}

		this.emit(type, { ...data, userId })
	}

	// Event system
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

	// Canvas-specific methods
	sendPixelUpdate(x, y, color) {
		return this.send('pixel_update', { x, y, color })
	}

	sendCursorUpdate(x, y) {
		return this.send('cursor_update', { x, y })
	}

	sendUserJoin(userData) {
		return this.send('user_join', userData)
	}

	sendUserLeave() {
		return this.send('user_leave', {})
	}

	// Get connection status
	getConnectionStatus() {
		return {
			connected: this.isConnected,
			userId: this.userId,
			roomId: this.roomId
		}
	}
}

// Export singleton instance
export const multisynqService = new MultisynqService()
export default multisynqService 