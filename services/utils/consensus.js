import { DateTime } from "luxon"

/**
 * Format large stake numbers in human-readable format
 * Converts from wei to MON tokens (1 MON = 10^18 wei)
 * Example: 6420000000000000000000000000 → "6.42B MON"
 * @param {string|number} value - Stake value in wei
 * @returns {string} Formatted compact notation
 */
export const formatStakeCompact = (value) => {
	if (!value || value === "0") return "0"

	const num = typeof value === "string" ? parseFloat(value) : value

	if (isNaN(num)) return "0"

	// Convert wei to MON (divide by 10^18)
	const MON = num / Math.pow(10, 18)

	// Format with suffixes
	const suffixes = [
		{ value: 1e12, suffix: "T" },  // Trillion
		{ value: 1e9, suffix: "B" },   // Billion
		{ value: 1e6, suffix: "M" },   // Million
		{ value: 1e3, suffix: "K" },   // Thousand
	]

	for (const { value: threshold, suffix } of suffixes) {
		if (MON >= threshold) {
			const formatted = (MON / threshold).toFixed(2)
			return `${formatted}${suffix} MON`
		}
	}

	// For values less than 1000 MON
	return `${MON.toFixed(2)} MON`
}

/**
 * Format stake for full display in tooltips
 * @param {string|number} value - Stake value in wei
 * @returns {string} Formatted number with commas
 */
export const formatStakeFull = (value) => {
	if (!value || value === "0") return "0"

	const num = typeof value === "string" ? parseFloat(value) : value

	if (isNaN(num)) return "0"

	return num.toLocaleString("en-US", {
		maximumFractionDigits: 0,
	})
}

/**
 * Format percentage with 2 decimal places
 * @param {number} value - Percentage value (0-100)
 * @returns {string} Formatted percentage (e.g., "66.67%")
 */
export const formatPercentage = (value) => {
	if (value === null || value === undefined || isNaN(value)) return "N/A"

	return `${value.toFixed(2)}%`
}

/**
 * Get color based on quorum threshold
 * @param {number} percentage - Current percentage
 * @param {number} quorumThreshold - Quorum threshold (default 66.67)
 * @returns {string} Color name (danger/warning/success)
 */
export const getQuorumColor = (percentage, quorumThreshold = 66.67) => {
	if (percentage === null || percentage === undefined) return "tertiary"

	if (percentage < 50) return "red"
	if (percentage < quorumThreshold) return "yellow"
	return "green"
}

/**
 * Get relative time from timestamp
 * @param {string|number} timestamp - ISO timestamp, SQL timestamp, or unix timestamp
 * @returns {string} Relative time (e.g., "2 seconds ago")
 */
export const getRelativeTime = (timestamp) => {
	if (!timestamp) return "N/A"

	try {
		let dt
		if (typeof timestamp === "string") {
			// Try SQL format first (e.g., "2025-10-25 06:50:49.913")
			// API sends UTC timestamps, so we need to specify zone
			dt = DateTime.fromSQL(timestamp, { zone: 'utc' })
			// If invalid, try ISO format
			if (!dt.isValid) {
				dt = DateTime.fromISO(timestamp)
			}
		} else {
			dt = DateTime.fromMillis(timestamp)
		}

		return dt.isValid ? (dt.toRelative() || "N/A") : "N/A"
	} catch (error) {
		return "N/A"
	}
}

/**
 * Get absolute time for tooltip
 * @param {string|number} timestamp - ISO timestamp, SQL timestamp, or unix timestamp
 * @returns {string} Formatted absolute time
 */
export const getAbsoluteTime = (timestamp) => {
	if (!timestamp) return "N/A"

	try {
		let dt
		if (typeof timestamp === "string") {
			// Try SQL format first (e.g., "2025-10-25 06:50:49.913")
			// API sends UTC timestamps, so we need to specify zone
			dt = DateTime.fromSQL(timestamp, { zone: 'utc' })
			// If invalid, try ISO format
			if (!dt.isValid) {
				dt = DateTime.fromISO(timestamp)
			}
		} else {
			dt = DateTime.fromMillis(timestamp)
		}

		return dt.isValid ? (dt.toFormat("yyyy-MM-dd HH:mm:ss") + " UTC") : "N/A"
	} catch (error) {
		return "N/A"
	}
}

/**
 * Check if data is stale (more than threshold seconds old)
 * @param {string|number} lastUpdate - Last update timestamp (ISO, SQL, or unix)
 * @param {number} thresholdSeconds - Threshold in seconds (default 10)
 * @returns {boolean} True if data is stale
 */
export const isDataStale = (lastUpdate, thresholdSeconds = 10) => {
	if (!lastUpdate) return true

	try {
		let dt
		if (typeof lastUpdate === "string") {
			// Try SQL format first (e.g., "2025-10-25 06:50:49.913")
			// API sends UTC timestamps, so we need to specify zone
			dt = DateTime.fromSQL(lastUpdate, { zone: 'utc' })
			// If invalid, try ISO format
			if (!dt.isValid) {
				dt = DateTime.fromISO(lastUpdate)
			}
		} else {
			dt = DateTime.fromMillis(lastUpdate)
		}

		if (!dt.isValid) return true

		const now = DateTime.utc()
		const diffSeconds = now.diff(dt, "seconds").seconds

		return diffSeconds > thresholdSeconds
	} catch (error) {
		return true
	}
}

/**
 * Format validator name with fallback
 * Priority: github.name → infrastructure.validator_name → Validator #ID → short hex
 * @param {object|string} validator - Validator object or validator name string
 * @param {string} fallbackId - Fallback ID (validator_id or author address)
 * @returns {string} Formatted name
 */
export const formatValidatorName = (validator, fallbackId) => {
	// Handle legacy string input (backward compatibility)
	if (typeof validator === 'string') {
		const validatorName = validator
		if (validatorName && validatorName !== "unknown") {
			return validatorName
		}
		// Fallback to shortened ID
		if (fallbackId && fallbackId.length > 14) {
			return `${fallbackId.slice(0, 8)}...${fallbackId.slice(-6)}`
		}
		return fallbackId || "Unknown"
	}

	// Handle validator object
	if (validator && typeof validator === 'object') {
		// Priority 1: GitHub name
		if (validator.github?.name) {
			return validator.github.name
		}

		// Priority 2: Infrastructure validator name
		if (validator.infrastructure?.validator_name &&
		    validator.infrastructure.validator_name !== "unknown") {
			return validator.infrastructure.validator_name
		}

		// Priority 3: displayName if already computed
		if (validator.displayName && validator.displayName !== "unknown") {
			return validator.displayName
		}

		// Priority 4: Validator #<precompile_validator_id>
		if (validator.staking?.precompile_validator_id) {
			return `Validator #${validator.staking.precompile_validator_id}`
		}

		// Priority 5: Short hex of validator_id
		const validatorId = validator.validator_id || fallbackId
		if (validatorId && validatorId.length > 16) {
			return `${validatorId.slice(0, 8)} ••• ${validatorId.slice(-8)}`
		}

		return validatorId || "Unknown"
	}

	return "Unknown"
}

/**
 * Get quorum status text
 * @param {boolean} isQuorumReached - Whether quorum is reached
 * @param {number} remainingPercentage - Remaining percentage to reach quorum
 * @returns {string} Status text
 */
export const getQuorumStatusText = (isQuorumReached, remainingPercentage) => {
	if (isQuorumReached) {
		return "Reached"
	}

	if (remainingPercentage !== null && remainingPercentage !== undefined) {
		return `Remaining ${remainingPercentage.toFixed(2)}%`
	}

	return "Not Reached"
}

/**
 * Export table data to CSV
 * @param {Array} data - Array of objects to export
 * @param {Array} columns - Column definitions [{key, label}]
 * @param {string} filename - Output filename
 */
export const exportToCSV = (data, columns, filename) => {
	if (!data || data.length === 0) {
		return
	}

	// Create CSV header
	const header = columns.map(col => col.label).join(",")

	// Create CSV rows
	const rows = data.map(row => {
		return columns.map(col => {
			const value = row[col.key]

			// Escape commas and quotes
			if (typeof value === "string" && (value.includes(",") || value.includes('"'))) {
				return `"${value.replace(/"/g, '""')}"`
			}

			return value || ""
		}).join(",")
	})

	// Combine header and rows
	const csv = [header, ...rows].join("\n")

	// Create and trigger download
	const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
	const link = document.createElement("a")
	const url = URL.createObjectURL(blob)

	link.setAttribute("href", url)
	link.setAttribute("download", filename)
	link.style.visibility = "hidden"

	document.body.appendChild(link)
	link.click()
	document.body.removeChild(link)
}
