import { defineStore } from "pinia"
import { v4 as uuidv4 } from "uuid"

export const useCanvasStore = defineStore("canvas", {
	state: () => ({
		// Canvas configuration
		canvasSize: 32,
		
		// Pixel data - 32x32 grid
		pixels: Array(32).fill().map(() => Array(32).fill("#000000")),
		
		// Drawing state
		selectedColor: "#18d2a5",
		isDrawing: false,
		currentTool: "brush", // brush, eraser
		
		// Collaboration
		connectedUsers: new Map(),
		isMultisynqConnected: false,
		
		// Statistics
		totalPixelsSet: 0,
		totalGasUsed: 0,
		userContributions: {},
		
		// Blockchain
		pixelTransactions: [], // Store tx hashes and metadata
		contractAddress: null,
		
		// Available colors
		colorPalette: [
			"#000000", // Black
			"#FFFFFF", // White
			"#18d2a5", // Brand mint
			"#379bff", // Blue
			"#eb5757", // Red
			"#ff5a17", // Orange
			"#e6c525", // Yellow
			"#0ade71", // Green
			"#5856de", // Purple
			"#ff69b4", // Pink
			"#8b4513", // Brown
			"#808080", // Gray
		]
	}),
	
	getters: {
		getPixel: (state) => (x, y) => {
			if (x >= 0 && x < state.canvasSize && y >= 0 && y < state.canvasSize) {
				return state.pixels[y][x]
			}
			return null
		},
		
		getPixelCount: (state) => {
			let count = 0
			for (let y = 0; y < state.canvasSize; y++) {
				for (let x = 0; x < state.canvasSize; x++) {
					if (state.pixels[y][x] !== "#000000") {
						count++
					}
				}
			}
			return count
		},
		
		getConnectedUsersList: (state) => {
			return Array.from(state.connectedUsers.values())
		},
		
		getUserContribution: (state) => (userId) => {
			return state.userContributions[userId] || 0
		},
		
		getAverageGasPerPixel: (state) => {
			return state.totalPixelsSet > 0 ? state.totalGasUsed / state.totalPixelsSet : 0
		}
	},
	
	actions: {
		// Canvas operations
		setPixel(x, y, color, userId = null, txHash = null) {
			if (x >= 0 && x < this.canvasSize && y >= 0 && y < this.canvasSize) {
				const oldColor = this.pixels[y][x]
				
				// Use Vue's reactivity system to ensure changes are detected
				const newPixels = [...this.pixels]
				newPixels[y] = [...newPixels[y]]
				newPixels[y][x] = color
				this.pixels = newPixels
				
				// Track statistics
				if (oldColor === "#000000" && color !== "#000000") {
					this.totalPixelsSet++
				} else if (oldColor !== "#000000" && color === "#000000") {
					this.totalPixelsSet = Math.max(0, this.totalPixelsSet - 1)
				}
				
				// Track user contributions
				if (userId) {
					this.userContributions[userId] = (this.userContributions[userId] || 0) + 1
				}
				
				// Track transaction
				if (txHash) {
					this.pixelTransactions.push({
						id: uuidv4(),
						x,
						y,
						color,
						userId,
						txHash,
						timestamp: Date.now()
					})
				}
			}
		},
		
		// Drawing tools
		setSelectedColor(color) {
			if (this.colorPalette.includes(color)) {
				this.selectedColor = color
			}
		},
		
		setCurrentTool(tool) {
			if (["brush", "eraser"].includes(tool)) {
				this.currentTool = tool
			}
		},
		
		setDrawing(isDrawing) {
			this.isDrawing = isDrawing
		},
		
		// Clear canvas
		clearCanvas() {
			this.pixels = Array(32).fill().map(() => Array(32).fill("#000000"))
			this.totalPixelsSet = 0
			this.pixelTransactions = []
		},
		
		// Collaboration
		addConnectedUser(user) {
			this.connectedUsers.set(user.id, {
				id: user.id,
				address: user.address,
				color: user.color || "#18d2a5",
				cursor: user.cursor || { x: 0, y: 0 },
				lastSeen: Date.now()
			})
		},
		
		removeConnectedUser(userId) {
			this.connectedUsers.delete(userId)
		},
		
		updateUserCursor(userId, x, y) {
			const user = this.connectedUsers.get(userId)
			if (user) {
				user.cursor = { x, y }
				user.lastSeen = Date.now()
			}
		},
		
		setMultisynqConnection(isConnected) {
			this.isMultisynqConnected = isConnected
		},
		
		// Blockchain
		addGasUsed(gasAmount) {
			this.totalGasUsed += gasAmount
		},
		
		setContractAddress(address) {
			this.contractAddress = address
		},
		
		addTransaction(transaction) {
			this.pixelTransactions.push({
				...transaction,
				timestamp: Date.now()
			})
		},
		
		// Load/Save canvas state
		loadCanvasFromData(pixelData) {
			if (Array.isArray(pixelData) && pixelData.length === this.canvasSize) {
				// Create a completely new array to trigger Vue reactivity
				this.pixels = pixelData.map(row => 
					Array.isArray(row) && row.length === this.canvasSize ? [...row] : Array(this.canvasSize).fill("#000000")
				)
			}
		},
		
		exportCanvasData() {
			return {
				pixels: this.pixels,
				totalPixelsSet: this.totalPixelsSet,
				totalGasUsed: this.totalGasUsed,
				userContributions: this.userContributions,
				timestamp: Date.now()
			}
		},
		
		// Cleanup old transactions (keep last 100)
		cleanupTransactions() {
			if (this.pixelTransactions.length > 100) {
				this.pixelTransactions = this.pixelTransactions.slice(-100)
			}
		}
	}
}) 