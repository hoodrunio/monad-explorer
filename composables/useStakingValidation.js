import { safeParseEther, validateStakingAmount } from '~/services/utils/stakingValidation'

/**
 * Validation composable for staking operations
 * Uses centralized utils for DRY compliance
 */
export function useStakingValidation() {

	// Validate stake amount - delegates to centralized util
	function validateStakeAmount(amount, availableBalance, minAmount = '0.001') {
		const errors = validateStakingAmount(amount, availableBalance, minAmount)
		// Customize error message for stake context
		return errors.map(e => e.replace('Minimum amount', 'Minimum stake amount'))
	}

	// Validate unstake amount - delegates to centralized util
	function validateUnstakeAmount(amount, stakedAmount, minAmount = '0.001') {
		const errors = validateStakingAmount(amount, stakedAmount, minAmount)
		// Customize error messages for unstake context
		return errors.map(e => {
			if (e.includes('Minimum amount')) return e.replace('Minimum amount', 'Minimum unstake amount')
			if (e.includes('Insufficient balance')) return 'Amount exceeds staked balance'
			return e
		})
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
		const amountWei = safeParseEther(amount?.toString() || '0')
		const balanceWei = safeParseEther(totalBalance?.toString() || '0')
		const reserveWei = safeParseEther(gasReserve)

		if (amountWei === null || balanceWei === null || reserveWei === null) {
			return false
		}

		return amountWei + reserveWei <= balanceWei
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
