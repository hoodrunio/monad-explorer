#!/usr/bin/env node

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

// ES module compatibility
const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Nominatim API configuration
const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org"
const DELAY_BETWEEN_REQUESTS = 1000 // 1 second to respect rate limits
const OUTPUT_FILE = path.join(__dirname, '../public/data/geocoding-cache.json')

// Your API endpoints (adjust these URLs to match your actual API)
const API_BASE = "https://monad-indexer.hoodscan.io" // Update this to your actual API base
const GEOGRAPHIC_DISTRIBUTION_URL = `${API_BASE}/api/dns/geographic-distribution`
const NETWORK_TOPOLOGY_URL = `${API_BASE}/api/dns/network-topology`

/**
 * Fetch data from an API endpoint
 */
async function fetchApiData(url) {
	try {
		const response = await fetch(url)
		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`)
		}
		return await response.json()
	} catch (error) {
		console.error(`Failed to fetch ${url}:`, error.message)
		return null
	}
}

/**
 * Geocode a single location using Nominatim
 */
async function geocodeLocation(locationString) {
	try {
		const url = new URL(`${NOMINATIM_BASE_URL}/search`)
		url.searchParams.append('q', locationString)
		url.searchParams.append('format', 'json')
		url.searchParams.append('limit', '1')
		url.searchParams.append('addressdetails', '1')

		const response = await fetch(url.href, {
			headers: {
				'User-Agent': 'Celenium-Interface-BuildScript/1.0 (https://explorer.monad.io)'
			}
		})

		if (!response.ok) {
			console.warn(`Geocoding failed for "${locationString}": ${response.status}`)
			return [0, 0]
		}

		const data = await response.json()
		
		if (!data || data.length === 0) {
			console.warn(`No geocoding results for "${locationString}"`)
			return [0, 0]
		}

		const result = data[0]
		const coordinates = [parseFloat(result.lon), parseFloat(result.lat)]
		
		console.log(`✓ Geocoded: ${locationString} -> [${coordinates[0]}, ${coordinates[1]}]`)
		return coordinates
	} catch (error) {
		console.error(`Geocoding error for "${locationString}":`, error.message)
		return [0, 0]
	}
}

/**
 * Extract unique locations from API data
 */
function extractUniqueLocations(geographicData, topologyData) {
	const locations = new Set()

	// Extract from geographic distribution data
	if (geographicData?.data?.distribution) {
		geographicData.data.distribution.forEach(item => {
			if (item.location) {
				locations.add(item.location)
			}
		})
	}

	// Extract from topology data
	if (topologyData?.data?.geographicDistribution) {
		Object.keys(topologyData.data.geographicDistribution).forEach(location => {
			locations.add(location)
		})
	}

	return Array.from(locations)
}

/**
 * Load existing cache if it exists
 */
function loadExistingCache() {
	try {
		if (fs.existsSync(OUTPUT_FILE)) {
			const cacheData = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'))
			console.log(`📂 Loaded existing cache with ${Object.keys(cacheData.locations || {}).length} locations`)
			return cacheData.locations || {}
		}
	} catch (error) {
		console.warn('Could not load existing cache:', error.message)
	}
	return {}
}

/**
 * Save geocoding cache to file
 */
function saveGeocodingCache(locationCoordinates) {
	const cacheData = {
		version: "1.0",
		generatedAt: new Date().toISOString(),
		totalLocations: Object.keys(locationCoordinates).length,
		source: "nominatim",
		locations: locationCoordinates
	}

	// Ensure the directory exists
	const dir = path.dirname(OUTPUT_FILE)
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true })
	}

	fs.writeFileSync(OUTPUT_FILE, JSON.stringify(cacheData, null, 2), 'utf8')
	console.log(`💾 Saved geocoding cache to: ${OUTPUT_FILE}`)
}

/**
 * Main build function
 */
async function buildGeocodingCache() {
	console.log('🌍 Building geocoding cache...\n')

	// Load existing cache
	const existingCache = loadExistingCache()
	
	console.log('📡 Fetching API data...')
	
	// Fetch data from APIs
	const [geographicData, topologyData] = await Promise.all([
		fetchApiData(GEOGRAPHIC_DISTRIBUTION_URL),
		fetchApiData(NETWORK_TOPOLOGY_URL)
	])

	if (!geographicData && !topologyData) {
		console.error('❌ Failed to fetch any API data. Please check your API endpoints.')
		process.exit(1)
	}

	// Extract unique locations
	const uniqueLocations = extractUniqueLocations(geographicData, topologyData)
	console.log(`📍 Found ${uniqueLocations.length} unique locations`)

	// Filter out locations that are already cached
	const locationsToGeocode = uniqueLocations.filter(location => !existingCache[location])
	console.log(`🔄 Need to geocode ${locationsToGeocode.length} new locations`)

	if (locationsToGeocode.length === 0) {
		console.log('✅ All locations already cached!')
		return
	}

	// Start with existing cache
	const locationCoordinates = { ...existingCache }
	
	// Geocode new locations with rate limiting
	console.log('\n🗺️  Starting geocoding process...')
	for (let i = 0; i < locationsToGeocode.length; i++) {
		const location = locationsToGeocode[i]
		
		console.log(`[${i + 1}/${locationsToGeocode.length}] Geocoding: ${location}`)
		
		const coordinates = await geocodeLocation(location)
		locationCoordinates[location] = coordinates
		
		// Rate limiting delay (except for the last request)
		if (i < locationsToGeocode.length - 1) {
			await new Promise(resolve => setTimeout(resolve, DELAY_BETWEEN_REQUESTS))
		}
	}

	// Save the cache
	saveGeocodingCache(locationCoordinates)
	
	console.log('\n✅ Geocoding cache build completed!')
	console.log(`📊 Total locations in cache: ${Object.keys(locationCoordinates).length}`)
	
	// Report any failed geocoding
	const failedLocations = Object.entries(locationCoordinates)
		.filter(([_, coords]) => coords[0] === 0 && coords[1] === 0)
	
	if (failedLocations.length > 0) {
		console.log(`⚠️  ${failedLocations.length} locations could not be geocoded:`)
		failedLocations.forEach(([location]) => console.log(`   - ${location}`))
	}
}

// Run the build script
buildGeocodingCache().catch(error => {
	console.error('❌ Build failed:', error)
	process.exit(1)
}) 