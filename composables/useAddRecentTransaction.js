/**
 * RainbowKit-style composable for adding recent transactions
 * Similar to RainbowKit's useAddRecentTransaction hook
 */
export function useAddRecentTransaction() {
	const stakingStore = useStakingStore()
	
	/**
	 * Add a recent transaction to track its status
	 * @param {Object} transaction - Transaction details
	 * @param {string} transaction.hash - Transaction hash
	 * @param {string} transaction.description - Human readable description
	 * @param {number} [transaction.confirmations=1] - Required confirmations
	 */
	function addRecentTransaction({ hash, description, confirmations = 1 }) {
		if (!hash || !description) {
			console.warn('addRecentTransaction requires hash and description')
			return
		}
		
		// Add to pending transactions in the store
		stakingStore.pendingTransactions.push({
			hash,
			description, 
			confirmations,
			timestamp: Date.now(),
			status: 'pending'
		})
		
		// Watch for transaction completion
		watchTransactionStatus(hash, confirmations)
	}
	
	/**
	 * Watch transaction status and update when completed
	 */
	async function watchTransactionStatus(hash, requiredConfirmations) {
		try {
			const { $wagmiConfig } = useNuxtApp()
			
			// Wait for transaction receipt
			const receipt = await waitForTransactionReceipt($wagmiConfig, { 
				hash,
				confirmations: requiredConfirmations
			})
			
			// Update transaction status
			const txIndex = stakingStore.pendingTransactions.findIndex(tx => tx.hash === hash)
			if (txIndex >= 0) {
				stakingStore.pendingTransactions[txIndex].status = receipt.status === 'success' ? 'success' : 'failed'
				stakingStore.pendingTransactions[txIndex].blockNumber = receipt.blockNumber
				stakingStore.pendingTransactions[txIndex].gasUsed = receipt.gasUsed
				
				// Remove from pending after a delay to show success state
				setTimeout(() => {
					stakingStore.pendingTransactions = stakingStore.pendingTransactions.filter(tx => tx.hash !== hash)
				}, 3000)
			}
			
		} catch (error) {
			console.error('Transaction failed:', error)
			
			// Mark as failed
			const txIndex = stakingStore.pendingTransactions.findIndex(tx => tx.hash === hash)
			if (txIndex >= 0) {
				stakingStore.pendingTransactions[txIndex].status = 'failed'
				stakingStore.pendingTransactions[txIndex].error = error.message
			}
		}
	}
	
	return addRecentTransaction
}
