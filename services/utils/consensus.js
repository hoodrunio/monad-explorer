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
			dt = DateTime.fromSQL(timestamp)
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
			dt = DateTime.fromSQL(timestamp)
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
			dt = DateTime.fromSQL(lastUpdate)
			// If invalid, try ISO format
			if (!dt.isValid) {
				dt = DateTime.fromISO(lastUpdate)
			}
		} else {
			dt = DateTime.fromMillis(lastUpdate)
		}

		if (!dt.isValid) return true

		const now = DateTime.now()
		const diffSeconds = now.diff(dt, "seconds").seconds

		return diffSeconds > thresholdSeconds
	} catch (error) {
		return true
	}
}

/**
 * Format validator name with fallback
 * @param {string} validatorName - Validator name from API
 * @param {string} author - Author address as fallback
 * @returns {string} Formatted name
 */
export const formatValidatorName = (validatorName, author) => {
	if (validatorName && validatorName !== "unknown") {
		return validatorName
	}

	// Shorten author address to first 8 and last 6 characters
	if (author && author.length > 14) {
		return `${author.slice(0, 8)}...${author.slice(-6)}`
	}

	return author || "Unknown"
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
