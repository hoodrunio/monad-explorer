<template>
	<div :class="$style.wrapper">
		<div :class="$style.header">
			<Text size="14" weight="600" color="secondary">{{ chartTitle }}</Text>
		</div>

		<div v-if="isLoading" :class="$style.loading">
			<Text size="12" color="tertiary">Loading {{ chartTitle }}...</Text>
		</div>

		<div v-else-if="error" :class="$style.error">
			<Text size="12" color="red">Error loading {{ chartTitle }}</Text>
		</div>

		<div v-else-if="chartData.length === 0" :class="$style.empty">
			<Text size="12" color="tertiary">No data available</Text>
		</div>

		<div v-else ref="chartContainer" :class="$style.chart"></div>
	</div>
</template>

<script setup>
import * as d3 from "d3"

const props = defineProps({
	type: {
		type: String,
		required: true,
		validator: (value) => ['provider', 'geographic'].includes(value)
	},
})

const chartContainer = ref(null)
const chartData = ref([])
const isLoading = ref(true)
const error = ref(null)

const chartTitle = computed(() => {
	return props.type === 'provider' ? 'Infrastructure Providers' : 'Geographic Locations'
})

const apiUrl = computed(() => {
	const baseUrl = 'https://monad-indexer.hoodscan.io'
	return props.type === 'provider' 
		? `${baseUrl}/api/dns/network-topology`
		: `${baseUrl}/api/dns/geographic-distribution`
})

const fetchData = async () => {
	try {
		isLoading.value = true
		error.value = null
		
		console.log(`Fetching data for ${props.type} from:`, apiUrl.value)
		
		const response = await fetch(apiUrl.value)
		const data = await response.json()
		
		console.log(`Raw API response for ${props.type}:`, data)
		
		if (!data.success || !data.data) {
			throw new Error('API response indicates failure')
		}
		
		let processedData = []
		
		if (props.type === 'provider' && data.data.providerDistribution) {
			processedData = Object.entries(data.data.providerDistribution)
				.map(([name, count]) => ({ name, amount: count }))
				.sort((a, b) => b.amount - a.amount)
				.slice(0, 10)
		} else if (props.type === 'geographic' && data.data.distribution) {
			processedData = data.data.distribution
				.map(item => ({ name: item.location, amount: item.validatorCount }))
				.sort((a, b) => b.amount - a.amount)
				.slice(0, 10)
		}
		
		console.log(`Processed data for ${props.type}:`, processedData)
		chartData.value = processedData
		
		if (processedData.length > 0) {
			await nextTick()
			buildChart()
		}
		
	} catch (err) {
		console.error(`Error fetching ${props.type} data:`, err)
		error.value = err
		chartData.value = []
	} finally {
		isLoading.value = false
	}
}

const buildChart = () => {
	if (!chartContainer.value || chartData.value.length === 0) return
	
	console.log(`Building chart for ${props.type} with ${chartData.value.length} items`)
	
	// Clear any existing chart
	d3.select(chartContainer.value).selectAll("*").remove()
	
	const container = chartContainer.value
	const { width, height } = container.getBoundingClientRect()
	const margin = { top: 20, right: 20, bottom: 80, left: 40 }
	const chartWidth = width - margin.left - margin.right
	const chartHeight = height - margin.top - margin.bottom
	
	const svg = d3.select(container)
		.append("svg")
		.attr("width", width)
		.attr("height", height)
	
	const g = svg.append("g")
		.attr("transform", `translate(${margin.left},${margin.top})`)
	
	// Scales
	const x = d3.scaleBand()
		.domain(chartData.value.map(d => d.name))
		.range([0, chartWidth])
		.padding(0.1)
	
	const y = d3.scaleLinear()
		.domain([0, d3.max(chartData.value, d => d.amount)])
		.range([chartHeight, 0])
	
	// Bars
	g.selectAll(".bar")
		.data(chartData.value)
		.enter().append("rect")
		.attr("class", "bar")
		.attr("x", d => x(d.name))
		.attr("width", x.bandwidth())
		.attr("y", chartHeight)
		.attr("height", 0)
		.attr("fill", "#18d2a5")
		.transition()
		.duration(800)
		.delay((d, i) => i * 100)
		.attr("y", d => y(d.amount))
		.attr("height", d => chartHeight - y(d.amount))
	
	// X axis
	g.append("g")
		.attr("transform", `translate(0,${chartHeight})`)
		.call(d3.axisBottom(x))
		.selectAll("text")
		.attr("transform", "rotate(-45)")
		.style("text-anchor", "end")
		.style("font-size", "11px")
		.style("fill", "var(--txt-secondary)")
		.text(d => d.length > 20 ? d.substring(0, 17) + '...' : d)
	
	// Y axis
	g.append("g")
		.call(d3.axisLeft(y))
		.style("color", "var(--txt-tertiary)")
	
	// Add hover effects
	g.selectAll(".bar")
		.on("mouseover", function(event, d) {
			d3.select(this).attr("fill", "#20e6b8")
			
			// Simple tooltip
			const tooltip = d3.select("body").append("div")
				.attr("class", "chart-tooltip")
				.style("position", "absolute")
				.style("background", "var(--card-background)")
				.style("padding", "8px")
				.style("border-radius", "4px")
				.style("border", "1px solid var(--op-10)")
				.style("font-size", "12px")
				.style("pointer-events", "none")
				.style("z-index", "1000")
				.html(`<strong>${d.name}</strong><br/>${d.amount} validators`)
				.style("left", (event.pageX + 10) + "px")
				.style("top", (event.pageY - 10) + "px")
		})
		.on("mouseout", function() {
			d3.select(this).attr("fill", "#18d2a5")
			d3.selectAll(".chart-tooltip").remove()
		})
}

// Fetch data when component mounts
onMounted(() => {
	console.log(`MonadDistributionChart mounted for type: ${props.type}`)
	fetchData()
})

// Watch for container resize
watch(() => chartContainer.value, () => {
	if (chartData.value.length > 0) {
		nextTick(() => buildChart())
	}
})
</script>

<style module>
.wrapper {
	width: 100%;
	height: 300px;
	background: var(--card-background);
	border-radius: 12px;
	padding: 16px;
	display: flex;
	flex-direction: column;
}

.header {
	margin-bottom: 12px;
}

.loading, .error, .empty {
	flex: 1;
	display: flex;
	align-items: center;
	justify-content: center;
}

.chart {
	flex: 1;
	min-height: 0;
}
</style> 