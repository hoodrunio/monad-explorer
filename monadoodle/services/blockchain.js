/**
 * Blockchain Service
 * Handles Monad testnet interactions for pixel transactions
 */

import { ethers } from 'ethers'

// Simple pixel storage contract ABI
const PIXEL_CONTRACT_ABI = [
	"function setPixel(uint8 x, uint8 y, bytes3 color) external payable",
	"function getPixel(uint8 x, uint8 y) external view returns (bytes3)",
	"function getPixelOwner(uint8 x, uint8 y) external view returns (address)",
	"function getPixelTimestamp(uint8 x, uint8 y) external view returns (uint256)",
	"function getTotalPixelsSet() external view returns (uint256)",
	"function getOwnerBalance() external view returns (uint256)",
	"function withdraw() external",
	"event PixelSet(uint8 indexed x, uint8 indexed y, bytes3 color, address indexed owner, uint256 timestamp)"
]

class BlockchainService {
	constructor() {
		this.provider = null
		this.signer = null
		this.contract = null
		this.contractAddress = null
		this.isConnected = false
		this.callbacks = new Map()
		this.rpcUrl = null
	}

	// Initialize blockchain connection
	async initialize(rpcUrl, contractAddress = null) {
		this.rpcUrl = rpcUrl
		this.contractAddress = contractAddress
		
		try {
			// Create provider
			this.provider = new ethers.JsonRpcProvider(rpcUrl)
			
			// Test connection
			await this.provider.getNetwork()
			
			console.log('Connected to Monad testnet')
			return true
		} catch (error) {
			console.error('Failed to connect to Monad testnet:', error)
			return false
		}
	}

	// Connect user wallet
	async connectWallet() {
		try {
			if (!window.ethereum) {
				throw new Error('No Ethereum wallet found. Please install MetaMask.')
			}

			// Request account access
			const accounts = await window.ethereum.request({
				method: 'eth_requestAccounts'
			})

			if (accounts.length === 0) {
				throw new Error('No accounts found')
			}

			// Create provider and signer
			const provider = new ethers.BrowserProvider(window.ethereum)
			this.signer = await provider.getSigner()
			this.isConnected = true

			// Setup contract if address is available
			if (this.contractAddress) {
				this.contract = new ethers.Contract(
					this.contractAddress,
					PIXEL_CONTRACT_ABI,
					this.signer
				)
			}

			// Listen for account changes
			window.ethereum.on('accountsChanged', (accounts) => {
				if (accounts.length === 0) {
					this.disconnectWallet()
				} else {
					// Refresh connection with new account
					this.connectWallet()
				}
			})

			// Listen for network changes
			window.ethereum.on('chainChanged', () => {
				window.location.reload()
			})

			const address = await this.signer.getAddress()
			this.emit('walletConnected', { address })

			return {
				success: true,
				address
			}
		} catch (error) {
			console.error('Failed to connect wallet:', error)
			return {
				success: false,
				error: error.message
			}
		}
	}

	// Disconnect wallet
	disconnectWallet() {
		this.signer = null
		this.contract = null
		this.isConnected = false
		this.emit('walletDisconnected')
	}

	// Set contract address and create contract instance
	setContractAddress(address) {
		this.contractAddress = address
		
		if (this.signer) {
			this.contract = new ethers.Contract(
				address,
				PIXEL_CONTRACT_ABI,
				this.signer
			)
		}
	}

	// Send pixel transaction
	async setPixel(x, y, color) {
		if (!this.isConnected || !this.contract) {
			throw new Error('Wallet not connected or contract not available')
		}

		try {
			// Convert color hex to bytes3
			const colorBytes = this.hexToBytes3(color)
			
			// Calculate gas price (0.0001 MON = 100000000000000 wei)
			const gasPrice = ethers.parseUnits('0.0001', 'ether')

			// Send transaction
			const tx = await this.contract.setPixel(x, y, colorBytes, {
				value: gasPrice,
				gasLimit: 100000 // Estimate gas limit
			})

			console.log('Transaction sent:', tx.hash)
			this.emit('transactionSent', { hash: tx.hash, x, y, color })

			// Wait for confirmation
			const receipt = await tx.wait()
			
			console.log('Transaction confirmed:', receipt)
			this.emit('transactionConfirmed', { 
				hash: tx.hash, 
				receipt, 
				gasUsed: receipt.gasUsed,
				x, 
				y, 
				color 
			})

			return {
				success: true,
				hash: tx.hash,
				receipt,
				gasUsed: ethers.formatEther(receipt.gasUsed)
			}
		} catch (error) {
			console.error('Transaction failed:', error)
			this.emit('transactionFailed', { error: error.message, x, y, color })
			
			throw new Error(`Transaction failed: ${error.message}`)
		}
	}

	// Get pixel data from blockchain
	async getPixel(x, y) {
		if (!this.contract) {
			throw new Error('Contract not available')
		}

		try {
			const color = await this.contract.getPixel(x, y)
			const owner = await this.contract.getPixelOwner(x, y)
			const timestamp = await this.contract.getPixelTimestamp(x, y)

			return {
				color: this.bytes3ToHex(color),
				owner,
				timestamp: Number(timestamp)
			}
		} catch (error) {
			console.error('Failed to get pixel:', error)
			throw error
		}
	}

	// Get canvas statistics
	async getCanvasStats() {
		if (!this.contract) {
			throw new Error('Contract not available')
		}

		try {
			const totalPixels = await this.contract.getTotalPixelsSet()
			return {
				totalPixelsSet: Number(totalPixels)
			}
		} catch (error) {
			console.error('Failed to get canvas stats:', error)
			throw error
		}
	}

	// Get user's account info
	async getAccountInfo() {
		if (!this.signer) {
			throw new Error('Wallet not connected')
		}

		try {
			const address = await this.signer.getAddress()
			const balance = await this.provider.getBalance(address)
			
			return {
				address,
				balance: ethers.formatEther(balance)
			}
		} catch (error) {
			console.error('Failed to get account info:', error)
			throw error
		}
	}

	// Utility: Convert hex color to bytes3
	hexToBytes3(hex) {
		// Remove # if present
		if (hex.startsWith('#')) {
			hex = hex.slice(1)
		}
		
		// Ensure 6 characters
		if (hex.length === 3) {
			hex = hex.split('').map(c => c + c).join('')
		}
		
		return '0x' + hex
	}

	// Utility: Convert bytes3 to hex color
	bytes3ToHex(bytes3) {
		return bytes3
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

	// Get connection status
	getConnectionStatus() {
		return {
			connected: this.isConnected,
			contractAddress: this.contractAddress,
			provider: !!this.provider,
			signer: !!this.signer
		}
	}
}

// Export singleton instance
export const blockchainService = new BlockchainService()
export default blockchainService 