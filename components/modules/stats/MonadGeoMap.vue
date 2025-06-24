<script setup>
/** Vendor */
import * as d3 from "d3"

/** UI */
import Tooltip from "@/components/ui/Tooltip.vue"

/** API */
import { fetchGeographicDistribution, fetchNetworkTopology } from "@/services/api/main"

// Fetch data at the top level using proper composables
const { data: geographicData, pending: geoPending, error: geoError } = fetchGeographicDistribution()
const { data: topologyData, pending: topologyPending, error: topologyError } = fetchNetworkTopology()

const isLoading = computed(() => geoPending.value || topologyPending.value)
const hasError = computed(() => geoError.value || topologyError.value)
const geoMap = ref()
const validatorLocationData = ref([])
const chartView = ref("countries")

const handleChangeChartView = () => {
	if (chartView.value === "countries") {
		chartView.value = "cities"
	} else {
		chartView.value = "countries"
	}
}

// Simple country name to coordinates mapping for major countries
const getCountryCoordinates = (countryName) => {
	const coordinates = {
		"Germany": [10.4515, 51.1657],
		"Finland": [25.7482, 61.9241],
		"Sweden": [18.6435, 60.1282],
		"United States": [-95.7129, 37.0902],
		"Japan": [138.2529, 36.2048],
		"Lithuania": [23.8813, 55.1694],
		"Singapore": [103.8198, 1.3521],
		"Spain": [-3.7492, 40.4637],
		"Ireland": [-8.2439, 53.4129],
		"France": [2.2137, 46.2276],
		"Russia": [105.3188, 61.5240],
		"Argentina": [-63.6167, -38.4161],
		"Romania": [24.9668, 45.9432],
		"Poland": [19.1343, 51.9194],
		"South Korea": [127.7669, 35.9078],
		"Australia": [133.7751, -25.2744],
		"Canada": [-106.3468, 56.1304],
		"Netherlands": [5.2913, 52.1326],
		"United Kingdom": [-3.4360, 55.3781],
		"Austria": [14.5501, 47.5162],
		"India": [20.5937, 78.9629],
		"Thailand": [100.9925, 15.8700],
		"Slovakia": [19.6990, 48.6690],
		"Chile": [-71.5430, -35.6751],
		"Hong Kong": [114.1694, 22.3193],
		"Norway": [8.4689, 60.4720],
		"New Zealand": [174.8860, -40.9006],
		"Malta": [14.3754, 35.9375],
		"Brazil": [-51.9253, -14.2350],
		"South Africa": [22.9375, -30.5595],
		"Nigeria": [8.6753, 9.0820],
		"Czech Republic": [15.4730, 49.8175],
	}
	
	// Try exact match first
	if (coordinates[countryName]) {
		return coordinates[countryName]
	}
	
	// Try partial match
	for (const [country, coords] of Object.entries(coordinates)) {
		if (countryName.includes(country) || country.includes(countryName)) {
			return coords
		}
	}
	
	return [0, 0] // Default coordinates
}

// Map API country names to GeoJSON country names
const mapApiCountryToGeoJson = (apiCountryName) => {
	const countryMappings = {
		"United States": "USA",
		"The Netherlands": "Netherlands",
		"Netherlands": "Netherlands", 
		"United Kingdom": "England", // Note: GeoJSON uses "England" instead of "United Kingdom"
		"South Korea": "South Korea",
		"Hong Kong": null, // Hong Kong doesn't exist as separate country in GeoJSON
		"Czechia": "Czech Republic",
		"Czech Republic": "Czech Republic",
		"Russia": "Russia",
		"Germany": "Germany",
		"Finland": "Finland",
		"Sweden": "Sweden",
		"Japan": "Japan",
		"Lithuania": "Lithuania",
		"Singapore": null, // Singapore doesn't exist as separate country in GeoJSON
		"Spain": "Spain",
		"Ireland": "Ireland",
		"France": "France",
		"Argentina": "Argentina",
		"Romania": "Romania",
		"Poland": "Poland",
		"Australia": "Australia",
		"Canada": "Canada",
		"Austria": "Austria",
		"India": "India",
		"Thailand": "Thailand",
		"Slovakia": "Slovakia",
		"Chile": "Chile",
		"Norway": "Norway",
		"New Zealand": "New Zealand",
		"Malta": null, // Malta doesn't exist as separate country in GeoJSON
		"Brazil": "Brazil",
		"South Africa": "South Africa",
		"Nigeria": "Nigeria",
	}
	
	// Check for exact match first
	if (countryMappings.hasOwnProperty(apiCountryName)) {
		return countryMappings[apiCountryName]
	}
	
	// Check for partial matches
	for (const [apiName, geoJsonName] of Object.entries(countryMappings)) {
		if (apiCountryName.includes(apiName) || apiName.includes(apiCountryName)) {
			return geoJsonName
		}
	}
	
	// If no mapping found, return the original name
	return apiCountryName
}

const chartEl = ref()

const buildChart = async (chart) => {
	const { height, width } = chart.getBoundingClientRect()

	// Map and projection
	const projection = d3
		.geoMercator()
		.center([0, 40])
		.scale(width * 0.15)
		.translate([width / 2, height / 2])

	const countryMaxAmount = d3.max(geoMap.value, (d) => +d.amount)
	const countryColor = d3.scaleSequential(d3.piecewise(d3.interpolateRgb, ["#1e473d", "#18d2a5"])).domain([1, countryMaxAmount])

	const size = d3
		.scaleSqrt()
		.domain(d3.extent(validatorLocationData.value, (d) => +d.amount))
		.range([4, 20])

	const path = d3.geoPath().projection(projection)
	let zoomScale = 1

	/** SVG Container */
	const svg = d3.create("svg").attr("width", width).attr("height", height).attr("viewBox", [0, 0, width, height])

	// Tooltip
	const container = document.createElement("div")
	container.innerHTML = `
        <style>
            .tooltip {
                font-size: 13px;
                background: var(--card-background);
                pointer-events: none;
                border-radius: 6px;
                box-shadow: inset 0 0 0 1px var(--op-5), 0 14px 34px rgba(0, 0, 0, 15%), 0 4px 14px rgba(0, 0, 0, 5%);
                padding: 4px 8px 4px 8px;
                position: absolute;
                top: 10px;
                left: 10px;
                z-index: 1;
                display: none;
            }
        </style>
        <div class="tooltip"></div>
    `
	container.appendChild(svg.node())
	document.body.appendChild(container)

	const tooltip = container.querySelector(".tooltip")
	const mouseover = function (d) {
		tooltip.style.opacity = 1
	}
	const mousemove = function (event, d) {
		const { pageX, pageY } = event
		tooltip.style.display = "block"
		tooltip.style.left = `${pageX + 10}px`
		tooltip.style.top = `${pageY - 20}px`

		if (chartView.value === "countries") {
			tooltip.innerHTML = `
                <div class="flex items-center gap--8">
                    <span style="color: var(--txt-secondary);">${d.properties.name}:</span>
                    <span style="color: var(--txt-primary);">${d.amount} validators</span>
                </div>
            `
		} else if (chartView.value === "cities") {
			tooltip.innerHTML = `
                <div class="flex items-center gap--8">
                    <span style="color: var(--txt-secondary);">${d.name}:</span>
                    <span style="color: var(--txt-primary);">${d.amount} validators</span>
                </div>
            `
		}
	}
	const mouseleave = function (event, d) {
		tooltip.style.opacity = 0
	}

	// Main container
	const g = svg.append("g")

	// Draw the map
	const map = g
		.append("g")
		.selectAll("path")
		.data(geoMap.value)
		.enter()
		.append("path")
		.attr("stroke", "var(--geo-map)")
		.attr("stroke-width", 1)
		.attr("fill", "transparent")
		.attr("d", d3.geoPath().projection(projection))

	let cities
	if (chartView.value === "countries") {
		map.on("mouseover", function (event, d) {
			d3.select(this)
				.transition()
				.duration(200)
				.attr("stroke", "var(--brand)")
				.attr("stroke-width", 2 / zoomScale)
			d3.select(this).raise()
			mouseover(event, d)
		})
			.on("mousemove", mousemove)
			.on("mouseleave", function (event, d) {
				d3.select(this)
					.transition()
					.duration(200)
					.attr("stroke", "var(--geo-map)")
					.attr("stroke-width", 1 / zoomScale)
				d3.select(this).lower()
				mouseleave(event, d)
			})

		map.transition()
			.duration(700)
			.attr("fill", (d) => (d.amount ? countryColor(+d.amount) : "transparent"))
	} else if (chartView.value === "cities") {
		cities = g
			.append("g")
			.selectAll("cities")
			.data(validatorLocationData.value)
			.enter()
			.append("circle")
			.attr("transform", (d) => `translate(${d.x}, ${d.y})`)
			.attr("r", 0)
			.style("fill", "var(--brand)")
			.attr("fill-opacity", 0)
			.on("mouseover", mouseover)
			.on("mousemove", mousemove)
			.on("mouseleave", mouseleave)
		
		cities
			.transition()
			.delay((d, i) => i * 3)
			.duration(500)
			.attr("r", (d) => size(+d.amount))
			.attr("fill-opacity", 0.7)
	}

	// Add zoom functionality
	const bounds = d3.geoPath().projection(projection).bounds({ type: "FeatureCollection", features: geoMap.value })
	const [[x0, y0], [x1, y1]] = bounds
	const zoom = d3
		.zoom()
		.scaleExtent([1, 20])
		.translateExtent([
			[x0, y0],
			[x1, y1],
		])
		.on("zoom", (event) => {
			tooltip.style.opacity = 0
			zoomScale = event.transform.k
			g.attr("transform", event.transform)
			map.attr("stroke-width", 1 / zoomScale)
			
			if (chartView.value === "cities" && cities) {
				cities.attr("r", (d) => size(+d.amount) / (zoomScale * 1.1))
			}
		})

	svg.call(zoom)
	svg.on("wheel", (event) => event.preventDefault(), { passive: false })

	if (chart.children[0]) chart.children[0].remove()
	chart.append(svg.node())
}

// Process data when API responses are available
const processMapData = async () => {
	try {
		if (!isLoading.value && !hasError.value && geographicData.value && topologyData.value) {
			// Process geographic distribution data (for city view)
			if (geographicData.value?.data?.distribution) {
				validatorLocationData.value = geographicData.value.data.distribution.map(item => {
					// Extract country from location string (e.g., "Falkenstein, Germany" -> "Germany")
					const locationParts = item.location.split(', ')
					const country = locationParts[locationParts.length - 1]
					// For city view, we use the original country name for coordinates
					const coordinates = getCountryCoordinates(country)
					const projection = d3.geoMercator()
						.center([0, 40])
						.scale(chartEl.value?.wrapper ? chartEl.value.wrapper.getBoundingClientRect().width * 0.15 : 150)
						.translate([300, 200]) // Default values
					
					const coords = projection(coordinates)
					
					return {
						name: item.location,
						amount: item.validatorCount,
						x: coords[0],
						y: coords[1],
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
					const locationParts = location.split(', ')
					const country = locationParts[locationParts.length - 1].trim() // Trim whitespace
					const mappedCountry = mapApiCountryToGeoJson(country)
					
					// Debug logging for United States
					if (country === 'United States') {
						console.log('Mapping United States to:', mappedCountry)
					}
					
					// Only count if the country maps to a valid GeoJSON country (not null)
					if (mappedCountry) {
						countryValidatorCounts[mappedCountry] = (countryValidatorCounts[mappedCountry] || 0) + count
					} else {
						unmappedCountries.add(country)
					}
				})

				// Log unmapped countries for debugging
				if (unmappedCountries.size > 0) {
					console.warn('Countries not mapped to GeoJSON:', Array.from(unmappedCountries))
				}

				// Debug: Log the final country validator counts
				console.log('Country validator counts:', countryValidatorCounts)
				console.log('Total validators in country mapping:', Object.values(countryValidatorCounts).reduce((sum, count) => sum + count, 0))

				// Map country data to geo features
				geoMap.value = geoMap.value.map((feature) => ({
					...feature,
					amount: countryValidatorCounts[feature.properties.name] || 0,
				}))
			}

			if (chartEl.value?.wrapper && geoMap.value) {
				await buildChart(chartEl.value.wrapper)
			}
		}
	} catch (error) {
		console.error('Error processing map data:', error)
	}
}

// Watch for API data changes
watch([geographicData, topologyData, isLoading], () => {
	processMapData()
}, { immediate: true })

onMounted(async () => {
	try {
		const geoData = await d3.json("https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson")
		if (geoData?.features.length) {
			geoMap.value = geoData.features.filter((d) => d.properties.name !== "Antarctica")
			// Process data if API data is already available
			await processMapData()
		}
	} catch (error) {
		console.error('Error loading geo map data:', error)
	}
})

watch(
	() => chartView.value,
	async () => {
		await buildChart(chartEl.value.wrapper)
	},
)
</script>

<template>
	<Flex direction="column" justify="start" gap="8" wide :class="$style.wrapper">
        <Flex
            @click="handleChangeChartView"
            align="center"
            gap="12"
            :class="$style.chart_selector"
            :style="{
                background: `linear-gradient(to ${chartView === 'countries' ? 'right' : 'left'}, var(--op-5) 50%, transparent 50%)`,
            }"
        >
            <Icon
                name="earth"
                size="14"
                :style="{ fill: `${chartView === 'countries' ? 'var(--mint)' : 'var(--txt-tertiary)'}` }"
            />

            <Icon
                name="city"
                size="14"
                :style="{ fill: `${chartView === 'cities' ? 'var(--mint)' : 'var(--txt-tertiary)'}` }"
            />
        </Flex>

        <Tooltip v-if="chartView === 'cities'" position="start" :class="$style.chart_info">
            <Icon name="info" size="16" color="yellow" />

            <template #content>
                <Flex align="center" gap="2" :style="{ width: '200px' }">
                    <Text size="12" weight="600" color="secondary">
                        City view shows validator distribution by specific locations
                    </Text>
                </Flex>
            </template>
        </Tooltip>
        
        <Flex ref="chartEl" :class="$style.chart" />

        <Flex v-if="isLoading" align="center" direction="column" gap="8" :class="$style.loader">
            <Text size="12" color="secondary">Loading Monad validator distribution...</Text>
        </Flex>

        <Flex v-else-if="hasError" align="center" direction="column" gap="8" :class="$style.loader">
            <Text size="12" color="red">Error loading validator distribution data</Text>
        </Flex>
	</Flex>
</template>

<style module>
.wrapper {
	width: 100%;
	height: 100%;
	position: relative;
}

.chart {
	width: 100%;
	height: 100%;
	overflow: hidden;

	& svg {
		overflow: visible;
	}
}

.chart_selector {
	width: 52px;
	position: absolute;
	top: 8px;
	right: 8px;
	padding: 4px 6px;
	box-shadow: inset 0 0 0 1px var(--op-10);
	border-radius: 5px;
	cursor: pointer;
	transition: all 1s ease-in-out;
}

.chart_info {
	position: absolute;
	top: 8px;
	left: 8px;
}

.loader {
	position: absolute;
	top: 30%;
	right: 50%;
	animation: blink 1s ease-in-out infinite;
}

@keyframes blink {
	0% { opacity: 1; }
	50% { opacity: 0.4; }
	100% { opacity: 1; }
}

@media (max-width: 1000px) {
	.wrapper {
		max-width: initial;
		width: 100%;
	}
}
</style> 