/** Services */
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"

// Static cache and runtime cache
let staticGeocodingCache = null
const runtimeGeocodingCache = new Map()

/**
 * Load the pre-built static geocoding cache
 * @returns {Promise<object>} - Static cache data
 */
export const loadStaticGeocodingCache = async () => {
	if (staticGeocodingCache !== null) {
		return staticGeocodingCache
	}

	try {
		const response = await fetch('/data/geocoding-cache.json')
		if (!response.ok) {
			console.warn('Static geocoding cache not found, will use live geocoding')
			staticGeocodingCache = {}
			return staticGeocodingCache
		}

		const cacheData = await response.json()
		staticGeocodingCache = cacheData.locations || {}
		
		console.log(`📍 Loaded static geocoding cache with ${Object.keys(staticGeocodingCache).length} locations`)
		console.log(`🕒 Cache generated at: ${cacheData.generatedAt}`)
		
		return staticGeocodingCache
	} catch (error) {
		console.warn('Failed to load static geocoding cache:', error)
		staticGeocodingCache = {}
		return staticGeocodingCache
	}
}

/**
 * Get coordinates for a location from cache or live geocoding
 * @param {string} locationString - Location string (e.g., "Tokyo, Japan")
 * @returns {Promise<[number, number]>} - [longitude, latitude] coordinates
 */
export const getLocationCoordinates = async (locationString) => {
	// Ensure static cache is loaded
	await loadStaticGeocodingCache()

	// Check static cache first
	if (staticGeocodingCache[locationString]) {
		return staticGeocodingCache[locationString]
	}

	// Check runtime cache
	if (runtimeGeocodingCache.has(locationString)) {
		return runtimeGeocodingCache.get(locationString)
	}

	// Fall back to live geocoding
	console.warn(`Location "${locationString}" not found in static cache, using live geocoding`)
	const coordinates = await geocodeLocationLive(locationString)
	
	// Cache the result in runtime cache
	runtimeGeocodingCache.set(locationString, coordinates)
	
	return coordinates
}

/**
 * Batch get coordinates for multiple locations
 * @param {string[]} locations - Array of location strings
 * @returns {Promise<Map<string, [number, number]>>} - Map of location to coordinates
 */
export const batchGetLocationCoordinates = async (locations) => {
	// Ensure static cache is loaded
	await loadStaticGeocodingCache()

	const results = new Map()
	const missingLocations = []

	// First pass: get from static cache
	for (const location of locations) {
		if (staticGeocodingCache[location]) {
			results.set(location, staticGeocodingCache[location])
		} else if (runtimeGeocodingCache.has(location)) {
			results.set(location, runtimeGeocodingCache.get(location))
		} else {
			missingLocations.push(location)
		}
	}

	// Second pass: live geocode missing locations (if any)
	if (missingLocations.length > 0) {
		console.warn(`${missingLocations.length} locations not found in cache, using live geocoding:`, missingLocations)
		
		for (const location of missingLocations) {
			const coordinates = await geocodeLocationLive(location)
			results.set(location, coordinates)
			runtimeGeocodingCache.set(location, coordinates)
			
			// Rate limiting for live requests
			await new Promise(resolve => setTimeout(resolve, 1000))
		}
	}

	return results
}

/**
 * Live geocode a location using Nominatim API (fallback)
 * @param {string} locationString - Location string
 * @returns {Promise<[number, number]>} - [longitude, latitude] coordinates
 */
async function geocodeLocationLive(locationString) {
	try {
		const url = new URL(`${NOMINATIM_BASE_URL}/search`)
		url.searchParams.append('q', locationString)
		url.searchParams.append('format', 'json')
		url.searchParams.append('limit', '1')
		url.searchParams.append('addressdetails', '1')

		const response = await fetch(url.href, {
			headers: {
				'User-Agent': 'Celenium-Interface/1.0 (https://explorer.monad.io)'
			}
		})

		if (!response.ok) {
			console.warn(`Live geocoding failed for "${locationString}": ${response.status}`)
			return [0, 0]
		}

		const data = await response.json()
		
		if (!data || data.length === 0) {
			console.warn(`No live geocoding results for "${locationString}"`)
			return [0, 0]
		}

		const result = data[0]
		const coordinates = [parseFloat(result.lon), parseFloat(result.lat)]
		
		console.log(`🌐 Live geocoded: ${locationString} -> [${coordinates[0]}, ${coordinates[1]}]`)
		return coordinates
	} catch (error) {
		console.error(`Live geocoding error for "${locationString}":`, error)
		return [0, 0]
	}
}

// Legacy function names for backward compatibility
export const geocodeLocation = getLocationCoordinates
export const batchGeocodeLocations = batchGetLocationCoordinates

/**
 * Get country name from location string for country-level aggregation
 * @param {string} locationString - Location string (e.g., "Tokyo, Japan")
 * @returns {string} - Country name (e.g., "Japan")
 */
export const extractCountryFromLocation = (locationString) => {
	const parts = locationString.split(',').map(part => part.trim())
	return parts[parts.length - 1]
}

/**
 * Get cache statistics
 * @returns {object} - Cache statistics
 */
export const getCacheStats = async () => {
	await loadStaticGeocodingCache()
	
	return {
		staticCacheSize: Object.keys(staticGeocodingCache).length,
		runtimeCacheSize: runtimeGeocodingCache.size,
		totalCachedLocations: Object.keys(staticGeocodingCache).length + runtimeGeocodingCache.size
	}
}

/**
 * Reverse geocode coordinates to get location information
 * @param {number} lat - Latitude
 * @param {number} lon - Longitude
 * @returns {Promise<object>} - Location information
 */
export const reverseGeocode = async (lat, lon) => {
	const cacheKey = `${lat},${lon}`
	
	if (runtimeGeocodingCache.has(cacheKey)) {
		return runtimeGeocodingCache.get(cacheKey)
	}

	try {
		const url = new URL(`${NOMINATIM_BASE_URL}/reverse`)
		url.searchParams.append('lat', lat.toString())
		url.searchParams.append('lon', lon.toString())
		url.searchParams.append('format', 'json')
		url.searchParams.append('addressdetails', '1')

		const response = await fetch(url.href, {
			headers: {
				'User-Agent': 'Celenium-Interface/1.0 (https://explorer.monad.io)'
			}
		})

		if (!response.ok) {
			console.warn(`Reverse geocoding failed for ${lat}, ${lon}: ${response.status}`)
			return null
		}

		const data = await response.json()
		
		// Cache the result
		runtimeGeocodingCache.set(cacheKey, data)
		
		return data
	} catch (error) {
		console.error(`Reverse geocoding error for ${lat}, ${lon}:`, error)
		return null
	}
} 