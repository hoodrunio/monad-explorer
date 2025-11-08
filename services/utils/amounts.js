export const comma = (target, symbol = ",", fixed = 2) => {
	if (!target) return 0

	let num = parseFloat(target)

	if (num % 1 === 0) {
		num = num.toFixed(0)
	} else {
		num = num.toFixed(fixed)
	}

	if (num.includes(".")) {
		while (num[num.length - 1] === "0") {
			num = num.slice(0, num.length - 1)
		}
		if (num[num.length - 1] === ".") {
			num = num.slice(0, num.length - 1)
		}
	}

	if (num.split(".").length > 1 && fixed !== 2) {
		return `${num
			.split(".")[0]
			.toString()
			.replace(/\B(?=(\d{3})+(?!\d))/g, symbol)}.${num.split(".")[1]}`
	} else {
		return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, symbol)
	}
}

export const truncate = (num) => {
	if (!num) return num

	/** todo: refactor */
	if (num.toString().includes("e")) return 0

	const [left, right] = num.toString().split(".")
	let result = ""
	const rightArr = right ? right.split("") : []

	for (let i = 0; i < rightArr.length; i++) {
		const digit = rightArr[i]
		const nextDigit = rightArr[i + 1] && rightArr[i + 1] != 0 ? rightArr[i + 1] : ""

		if (digit == "0" || digit == ".") {
			result += digit
		} else {
			result += `${digit}${nextDigit}`
			break
		}
	}

	return left + (result ? `.${result}` : "")
}

export const mon = (amount) => {
	return formatValue(amount, 18)
}

export const formatAmount = (amount, decimals = 18) => {
	return formatValue(amount, decimals)
}

export const truncateDecimalPart = (amount, decimal = 6) => {
	if (!amount) return 0

	const numberString = amount.toFixed(decimal).replace(/\.?0+$/, "")

	return parseFloat(numberString)
}

export const numToPercent = (num, decimal = 0) => {
	return (num * 100).toFixed(decimal) + "%"
}

export const shareOfTotal = (amount, total, decimal = 2) => {
	if (!total) return 0

	return truncateDecimalPart((amount / total) * 100, decimal)
}

export const shareOfTotalString = (amount, total, decimal = 2) => {
	return amountToString(shareOfTotal(amount, total, decimal))
}

export const amountToString = (amount, decimal = 2) => {
	amount = parseFloat(amount)

	if (!amount) return 0

	return amount < 0.01 && decimal < 3
		? "<0.01"
		: truncateDecimalPart(amount, decimal).toLocaleString("en-US", { maximumFractionDigits: decimal })
}

export const roundTo = (num, decimal = 2, method = "round") => {
	const factor = Math.pow(10, decimal)
	return Math[method](num * factor) / factor
}

export const abbreviate = (n, h = 1) => {
	if (n < 1e3) return n
	if (n >= 1e3 && n < 1e6) {
		const kValue = +(n / 1e3).toFixed(h)
		// If the K value would be >= 999.5, show as M instead for better UX
		if (kValue >= 999.5) {
			return +(n / 1e6).toFixed(h) + "M"
		}
		return kValue + "K"
	}
	if (n >= 1e6 && n < 1e9) return +(n / 1e6).toFixed(h) + "M"
	if (n >= 1e9 && n < 1e12) return +(n / 1e9).toFixed(h) + "B"
	if (n >= 1e12) return +(n / 1e12).toFixed(h) + "T"
}

export const purgeNumber = (target) => {
	if (/^(0|[1-9]\d*)(\.\d+)?$/.test(target)) return target
	return target.replace(/[^0-9.]/g, "")
}

export const normalizeAmount = (target, max = 9_999_999_999_999, maxStr = "9 999 999 999 999") => {
	if (target === ".") return "0."

	let dotCounter = 0
	target.split("").forEach((char) => {
		if (char === ".") dotCounter++
	})
	if (dotCounter > 1) return target.slice(0, target.length - 1)

	if (target[target.length - 1] === ".") return target
	if (!target.length) return ""
	if (target.length === 1 && !/^(0|[1-9]\d*)(\.\d+)?$/.test(target)) return ""
	if (parseFloat(purgeNumber(target)) >= max) return maxStr
}

export const spaces = (num) => {
	if (!num) return 0
	
	return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
}

/**
 * Convert wei to other units (gwei, ether)
 * @param {string|number} weiAmount - Amount in wei
 * @param {number} decimals - Number of decimals to divide by (9 for gwei, 18 for ether)
 * @returns {number} - Converted amount
 */
export const convertFromWei = (weiAmount, decimals = 18) => {
	if (!weiAmount || weiAmount === "0") return 0
	
	const wei = BigInt(weiAmount.toString())
	const divisor = BigInt(10 ** decimals)
	
	// Convert to floating point number
	const result = Number(wei) / Number(divisor)
	
	return result
}

/**
 * Calculate savings from EIP-1559 transaction
 * @param {string} maxFeePerGas - Maximum fee per gas willing to pay
 * @param {string} effectiveGasPrice - Actual gas price paid
 * @param {string} gasUsed - Amount of gas used
 * @returns {string} - Savings in wei as string
 */
export const calculateSavings = (maxFeePerGas, effectiveGasPrice, gasUsed) => {
	if (!maxFeePerGas || !effectiveGasPrice || !gasUsed) return "0"
	if (maxFeePerGas === "0" || effectiveGasPrice === "0" || gasUsed === "0") return "0"

	try {
		const maxFeePaid = BigInt(maxFeePerGas) * BigInt(gasUsed)
		const actualFeePaid = BigInt(effectiveGasPrice) * BigInt(gasUsed)
		const savings = maxFeePaid - actualFeePaid
		return savings > 0n ? savings.toString() : "0"
	} catch (e) {
		return "0"
	}
}
