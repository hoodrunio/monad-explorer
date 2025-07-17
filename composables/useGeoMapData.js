import * as d3 from "d3"
import { fetchGeographicDistribution, fetchNetworkTopology } from "@/services/api/main"
import { batchGetLocationCoordinates, extractCountryFromLocation } from "@/services/api/geocoding"
import { normalizeCountryName } from "@/utils/geoMapUtils"

export const useGeoMapData = () => {
	// Fetch data at the top level using proper composables
	const { data: geographicData, pending: geoPending, error: geoError } = fetchGeographicDistribution()
	const { data: topologyData, pending: topologyPending, error: topologyError } = fetchNetworkTopology()

	const isLoading = computed(() => geoPending.value || topologyPending.value)
	const hasError = computed(() => geoError.value || topologyError.value)
	const geoMap = ref()
	const validatorLocationData = ref([])

	// Process data when API responses are available
	const processMapData = async () => {
		try {
			if (!isLoading.value && !hasError.value && geographicData.value && topologyData.value) {
				// Process geographic distribution data (for city view)
				if (geographicData.value?.data?.distribution) {
					const locations = geographicData.value.data.distribution.map(item => item.location)
					
					// Get coordinates from static cache (fast)
					const coordinatesMap = await batchGetLocationCoordinates(locations)
					
					validatorLocationData.value = geographicData.value.data.distribution.map(item => {
						const coordinates = coordinatesMap.get(item.location) || [0, 0]
						const country = extractCountryFromLocation(item.location)
						
						return {
							name: item.location,
							amount: item.validatorCount,
							coordinates: coordinates,
							originalCountry: country
						}
					})
				}

				// Process topology data for country-level aggregation (for country view)
				if (topologyData.value?.data?.geographicDistribution && geoMap.value) {
					const countryValidatorCounts = {}
					const unmappedCountries = new Set()
					
					// Aggregate validators by country
					Object.entries(topologyData.value.data.geographicDistribution).forEach(([location, count]) => {
						const country = extractCountryFromLocation(location)
						const normalizedCountry = normalizeCountryName(country)
						
						// Find matching GeoJSON feature
						const geoFeature = geoMap.value.find(feature => 
							feature.properties.name === normalizedCountry ||
							feature.properties.name === country ||
							feature.id === normalizedCountry ||
							feature.id === country
						)
						
						if (geoFeature) {
							const featureName = geoFeature.properties.name
							countryValidatorCounts[featureName] = (countryValidatorCounts[featureName] || 0) + count
						} else {
							unmappedCountries.add(country)
						}
					})

					// Log unmapped countries for debugging
					if (unmappedCountries.size > 0) {
					}

					// Map country data to geo features
					geoMap.value = geoMap.value.map((feature) => ({
						...feature,
						amount: countryValidatorCounts[feature.properties.name] || 0,
					}))
				}
			}
		} catch (error) {
		}
	}

	// Load GeoJSON data
	const loadGeoData = async () => {
		try {
			const geoData = await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
			if (geoData?.features.length) {
				geoMap.value = geoData.features.filter((d) => d.properties.name !== "Antarctica")
				// Process data if API data is already available
				await processMapData()
			}
		} catch (error) {
		}
	}

	// Watch for API data changes
	watch([geographicData, topologyData, isLoading], () => {
		processMapData()
	}, { immediate: true })

	return {
		geographicData,
		topologyData,
		isLoading,
		hasError,
		geoMap,
		validatorLocationData,
		processMapData,
		loadGeoData
	}
} 