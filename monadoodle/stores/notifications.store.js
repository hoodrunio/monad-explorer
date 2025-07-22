import { defineStore } from "pinia"
import { v4 as uuidv4 } from "uuid"

export const useNotificationsStore = defineStore("notifications", {
	state: () => ({
		notifications: [],
		maxNotifications: 50
	}),
	
	getters: {
		activeNotifications: (state) => {
			return state.notifications.filter(n => !n.dismissed)
		},
		
		recentNotifications: (state) => {
			return state.notifications
				.filter(n => !n.dismissed)
				.slice(-10) // Show last 10 notifications
		}
	},
	
	actions: {
		addNotification({
			type = "info", // info, success, warning, error
			title,
			message,
			duration = 5000,
			persistent = false,
			data = null
		}) {
			const notification = {
				id: uuidv4(),
				type,
				title,
				message,
				duration,
				persistent,
				data,
				timestamp: performance.now(),
				dismissed: false
			}
			
			this.notifications.push(notification)
			
			// Auto-dismiss non-persistent notifications
			if (!persistent && duration > 0) {
				setTimeout(() => {
					this.dismissNotification(notification.id)
				}, duration)
			}
			
			// Cleanup old notifications
			this.cleanupNotifications()
			
			return notification.id
		},
		
		dismissNotification(id) {
			const notification = this.notifications.find(n => n.id === id)
			if (notification) {
				notification.dismissed = true
			}
		},
		
		removeNotification(id) {
			const index = this.notifications.findIndex(n => n.id === id)
			if (index !== -1) {
				this.notifications.splice(index, 1)
			}
		},
		
		clearAllNotifications() {
			this.notifications.forEach(n => n.dismissed = true)
		},
		
		cleanupNotifications() {
			// Remove dismissed notifications older than 1 hour
			const oneHourAgo = performance.now() - (60 * 60 * 1000)
			this.notifications = this.notifications.filter(n => 
				!n.dismissed || n.timestamp > oneHourAgo
			)
			
			// Keep only the most recent notifications
			if (this.notifications.length > this.maxNotifications) {
				this.notifications = this.notifications.slice(-this.maxNotifications)
			}
		},
		
		// Convenience methods for different notification types
		showSuccess(title, message, options = {}) {
			return this.addNotification({
				type: "success",
				title,
				message,
				...options
			})
		},
		
		showError(title, message, options = {}) {
			return this.addNotification({
				type: "error",
				title,
				message,
				persistent: true, // Errors should be persistent by default
				...options
			})
		},
		
		showWarning(title, message, options = {}) {
			return this.addNotification({
				type: "warning",
				title,
				message,
				duration: 8000, // Warnings should stay longer
				...options
			})
		},
		
		showInfo(title, message, options = {}) {
			return this.addNotification({
				type: "info",
				title,
				message,
				...options
			})
		},
		
		// Canvas-specific notifications
		showPixelDrawn(x, y, color, userId) {
			return this.addNotification({
				type: "info",
				title: "Pixel Drawn",
				message: `Pixel at (${x}, ${y}) set to ${color}`,
				duration: 3000,
				data: { x, y, color, userId, type: "pixel_drawn" }
			})
		},
		
		showTransactionSent(txHash) {
			return this.addNotification({
				type: "info",
				title: "Transaction Sent",
				message: `Transaction sent: ${txHash.slice(0, 10)}...`,
				duration: 5000,
				data: { txHash, type: "transaction_sent" }
			})
		},
		
		showTransactionConfirmed(txHash, gasUsed) {
			return this.addNotification({
				type: "success",
				title: "Transaction Confirmed",
				message: `Transaction confirmed! Gas used: ${gasUsed}`,
				duration: 5000,
				data: { txHash, gasUsed, type: "transaction_confirmed" }
			})
		},
		
		showUserJoined(userId, address) {
			return this.addNotification({
				type: "info",
				title: "User Joined",
				message: `${address?.slice(0, 6)}...${address?.slice(-4)} joined the canvas`,
				duration: 3000,
				data: { userId, address, type: "user_joined" }
			})
		},
		
		showUserLeft(userId, address) {
			return this.addNotification({
				type: "info",
				title: "User Left",
				message: `${address?.slice(0, 6)}...${address?.slice(-4)} left the canvas`,
				duration: 3000,
				data: { userId, address, type: "user_left" }
			})
		},
		
		showConnectionStatus(isConnected, service) {
			const status = isConnected ? "Connected" : "Disconnected"
			const type = isConnected ? "success" : "warning"
			
			return this.addNotification({
				type,
				title: `${service} ${status}`,
				message: `${service} ${isConnected ? "connection established" : "connection lost"}`,
				duration: isConnected ? 3000 : 0, // Disconnection notifications persist
				data: { isConnected, service, type: "connection_status" }
			})
		}
	}
}) 