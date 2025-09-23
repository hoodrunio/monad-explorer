import { parseEther, formatEther } from 'viem'

/**
 * Validation composable for staking operations
 */
export function useStakingValidation() {
	
	// Validate stake amount
	function validateStakeAmount(amount, availableBalance, minAmount = '0.001') {
		const errors = []
		
		if (!amount || amount.trim() === '') {
			errors.push('Amount is required')
			return errors
		}
		
		const numAmount = parseFloat(amount)
		const numAvailable = parseFloat(availableBalance)
		const numMin = parseFloat(minAmount)
		
		if (isNaN(numAmount) || numAmount <= 0) {
			errors.push('Invalid amount')
		} else if (numAmount < numMin) {
			errors.push(`Minimum stake amount is ${minAmount} MON`)
		} else if (numAmount > numAvailable) {
			errors.push('Insufficient balance')
		}
		
		return errors
	}
	
	// Validate unstake amount
	function validateUnstakeAmount(amount, stakedAmount, minAmount = '0.001') {
		const errors = []
		
		if (!amount || amount.trim() === '') {
			errors.push('Amount is required')
			return errors
		}
		
		const numAmount = parseFloat(amount)
		const numStaked = parseFloat(stakedAmount)
		const numMin = parseFloat(minAmount)
		
		if (isNaN(numAmount) || numAmount <= 0) {
			errors.push('Invalid amount')
		} else if (numAmount < numMin) {
			errors.push(`Minimum unstake amount is ${minAmount} MON`)
		} else if (numAmount > numStaked) {
			errors.push('Amount exceeds staked balance')
		}
		
		return errors
	}
	
	// Validate validator selection
	function validateValidator(validator) {
		const errors = []
		
		if (!validator) {
			errors.push('Validator is required')
			return errors
		}
		
		// Note: Removed active validator check - users can stake to inactive validators
		
		if (validator.commissionRate > 50) {
			errors.push('High commission rate (>50%)')
		}
		
		return errors
	}
	
	// Validate wallet connection
	function validateWalletConnection(isConnected, isCorrectNetwork) {
		const errors = []
		
		if (!isConnected) {
			errors.push('Wallet not connected')
		} else if (!isCorrectNetwork) {
			errors.push('Please switch to Monad Testnet')
		}
		
		return errors
	}
	
	// Check epoch timing for optimal staking
	function getEpochTiming(inBoundary) {
		if (inBoundary) {
			return {
				warning: true,
				message: 'Currently in boundary period. Stake will be active in 2 epochs (~11 hours)',
				recommendedAction: 'Consider waiting for the next epoch for faster activation'
			}
		}
		
		return {
			warning: false,
			message: 'Stake will be active in next epoch (~5.5 hours)',
			recommendedAction: null
		}
	}
	
	// Format validation errors for display
	function formatErrors(errors) {
		if (!errors || errors.length === 0) return null
		
		if (errors.length === 1) {
			return errors[0]
		}
		
		return errors.join(', ')
	}
	
	// Check if amount is safe (not too close to total balance)
	function isSafeAmount(amount, totalBalance, gasReserve = '0.01') {
		try {
			const amountWei = parseEther(amount.toString())
			const balanceWei = parseEther(totalBalance.toString())
			const reserveWei = parseEther(gasReserve)
			
			return amountWei + reserveWei <= balanceWei
		} catch {
			return false
		}
	}
	
	return {
		validateStakeAmount,
		validateUnstakeAmount,
		validateValidator,
		validateWalletConnection,
		getEpochTiming,
		formatErrors,
		isSafeAmount,
	}
}
