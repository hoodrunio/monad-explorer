<script setup>
import { ref, computed } from 'vue'

/** API */
import { fetchGeographicDistribution } from "@/services/api/main"

const { data: geoData, pending: isLoading, error } = await fetchGeographicDistribution()

const geographicData = computed(() => {
  if (!geoData.value?.data?.distribution || !Array.isArray(geoData.value.data.distribution)) {
    return []
  }
  
  return geoData.value.data.distribution.map(region => ({
    location: region.location || 'Unknown',
    validatorCount: region.validatorCount || region.validator_count || 0,
    percentage: region.percentage || 0
  }))
})

const totalValidators = computed(() => {
  return geoData.value?.data?.totalValidators || 0
})

const getRegionColor = (index) => {
  const colors = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6']
  return colors[index % colors.length]
}
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Flex align="center" justify="between">
        <Text size="14" weight="600" color="primary">Geographic Distribution</Text>
        <NuxtLink to="/validators" :class="$style.view_map_link">
          <Text size="12" color="secondary">View All</Text>
        </NuxtLink>
      </Flex>
      
      <Flex v-if="isLoading" direction="column" gap="10">
        <Text size="12" color="tertiary">Loading geographic data...</Text>
      </Flex>
      
      <Flex v-else-if="error" direction="column" gap="10">
        <Text size="12" color="red">Error loading geographic data</Text>
      </Flex>
      
      <Flex v-else-if="geographicData.length === 0" direction="column" gap="10">
        <Text size="12" color="tertiary">No geographic data available</Text>
      </Flex>
      
      <Flex v-else direction="column" gap="10">
        <div 
          v-for="(region, index) in geographicData.slice(0, 5)" 
          :key="region.location"
          :class="$style.region_item"
        >
          <Flex align="center" justify="between" style="margin-bottom: 6px;">
            <Flex align="center" gap="8">
              <div 
                :class="$style.region_indicator"
                :style="{ backgroundColor: getRegionColor(index) }"
              ></div>
              <Text size="12" color="primary">{{ region.location }}</Text>
            </Flex>
            
            <Flex align="center" gap="8">
              <Text size="12" color="tertiary">{{ region.validatorCount }}</Text>
              <Text size="11" weight="600" color="secondary">
                {{ region.percentage.toFixed(1) }}%
              </Text>
            </Flex>
          </Flex>
          
          <!-- Progress bar -->
          <div :class="$style.progress_bar">
            <div 
              :class="$style.progress_fill"
              :style="{ 
                width: `${region.percentage}%`,
                backgroundColor: getRegionColor(index)
              }"
            ></div>
          </div>
        </div>
        
        <!-- Total validators info -->
        <div v-if="totalValidators > 0" :class="$style.total_info">
          <Text size="11" color="tertiary">
            Total: {{ totalValidators }} validators
          </Text>
        </div>
      </Flex>
    </Flex>
  </div>
</template>

<style module>
.wrapper {
  height: 100%;
  min-height: 164px;
  background: var(--card-background);
  border-radius: 12px;
  padding: 16px;
}

.region_item {
  padding: 4px 0;
}

.region_indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.progress_bar {
  width: 100%;
  height: 3px;
  background: var(--op-10);
  border-radius: 2px;
  overflow: hidden;
}

.progress_fill {
  height: 100%;
  transition: width 0.3s ease;
  border-radius: 2px;
}

.total_info {
  padding: 8px;
  background: var(--op-5);
  border-radius: 4px;
  margin-top: 4px;
  text-align: center;
}

.view_map_link {
  text-decoration: none;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
}
</style> 