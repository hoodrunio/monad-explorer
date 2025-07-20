import { defineStore } from "pinia"

export const useAppStore = defineStore("app", {
	state: () => ({
		theme: "dark",
		isConnected: false,
		connectedAddress: null,
		network: "monad-testnet",
		isLoading: false,
		currentUser: {
			id: null,
			address: null,
			color: "#18d2a5",
			cursor: { x: 0, y: 0 }
		}
	}),
	
	getters: {
		isDarkTheme: (state) => state.theme === "dark",
		isLightTheme: (state) => state.theme === "light", 
		isDimmedTheme: (state) => state.theme === "dimmed",
		shortAddress: (state) => {
			if (!state.connectedAddress) return null
			return `${state.connectedAddress.slice(0, 6)}...${state.connectedAddress.slice(-4)}`
		}
	},

	actions: {
		setTheme(theme) {
			if (["dark", "light", "dimmed"].includes(theme)) {
				this.theme = theme
				if (process.client) {
					document.documentElement.setAttribute("theme", theme)
					localStorage.setItem("theme", theme)
				}
			}
		},

		initializeTheme() {
			if (process.client) {
				const savedTheme = localStorage.getItem("theme") || "dark"
				this.setTheme(savedTheme)
			}
		},

		setWalletConnection(isConnected, address = null) {
			this.isConnected = isConnected
			this.connectedAddress = address
			if (isConnected && address) {
				this.currentUser.address = address
				this.currentUser.id = address.slice(-8) // Use last 8 chars as user ID
			} else {
				this.currentUser.address = null
				this.currentUser.id = null
			}
		},

		setLoading(isLoading) {
			this.isLoading = isLoading
		},

		updateUserCursor(x, y) {
			this.currentUser.cursor = { x, y }
		},

		setUserColor(color) {
			this.currentUser.color = color
		}
	}
}) 