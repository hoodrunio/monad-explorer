<script setup>
import { ref, computed } from 'vue'

/** UI */
import Badge from "@/components/ui/Badge.vue"

/** API */
import { fetchCentralizationRisks } from "@/services/api/main"

const { data: riskData, pending: isLoading, error } = await fetchCentralizationRisks()

const centralizationData = computed(() => {
  if (!riskData.value?.data) {
    // Fallback data while loading
    return {
      centralizationRisk: 'unknown',
      diversityScore: 0,
      providerConcentration: 0,
      geographicConcentration: 0,
      infrastructureDiversity: 0,
      topProviders: []
    }
  }
  
  const data = riskData.value.data
  return {
    centralizationRisk: data.centralizationRisk || 'unknown',
    diversityScore: data.diversityScore || 0,
    providerConcentration: data.riskFactors?.providerConcentration || 0,
    geographicConcentration: data.riskFactors?.geographicConcentration || 0,
    infrastructureDiversity: data.riskFactors?.infrastructureDiversity || 0,
    topProviders: Object.entries(data.providerRisks || {}).slice(0, 3).map(([name, info]) => ({
      name,
      validatorCount: info.validatorCount || 0,
      riskScore: info.riskScore || 0
    }))
  }
})

const riskLevel = computed(() => {
  if (isLoading.value) return { level: 'Loading...', color: 'tertiary' }
  if (error.value) return { level: 'Error', color: 'red' }
  
  const risk = centralizationData.value.centralizationRisk.toLowerCase()
  if (risk === 'low') return { level: 'Low', color: 'green' }
  if (risk === 'medium') return { level: 'Medium', color: 'yellow' }
  if (risk === 'high') return { level: 'High', color: 'red' }
  return { level: 'Unknown', color: 'tertiary' }
})

const formatPercentage = (value) => {
  return `${value.toFixed(1)}%`
}
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Flex align="center" justify="between">
        <Text size="14" weight="600" color="primary">Centralization Risk</Text>
        <Badge :class="[$style.risk_badge, $style[riskLevel.color]]">
          <Text size="12" weight="600" color="primary">{{ riskLevel.level }} Risk</Text>
        </Badge>
      </Flex>
      
      <Flex v-if="isLoading" direction="column" gap="12">
        <Text size="12" color="tertiary">Loading centralization metrics...</Text>
      </Flex>
      
      <Flex v-else-if="error" direction="column" gap="12">
        <Text size="12" color="red">Error loading centralization data</Text>
      </Flex>
      
      <Flex v-else direction="column" gap="12">
        <!-- Diversity Score -->
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Diversity Score</Text>
          <Text size="14" weight="600" color="primary">
            {{ centralizationData.diversityScore.toFixed(3) }}
          </Text>
        </Flex>
        
        <!-- Progress bar for diversity score -->
        <div :class="$style.score_bar">
          <div 
            :class="$style.score_progress" 
            :style="{ width: `${centralizationData.diversityScore * 100}%` }"
          ></div>
        </div>
        
        <!-- Divider -->
        <div :class="$style.divider"></div>
        
        <!-- Risk Factors -->
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Provider Concentration</Text>
          <Text size="14" weight="600" color="primary">
            {{ formatPercentage(centralizationData.providerConcentration) }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Geographic Risk</Text>
          <Text size="14" weight="600" color="primary">
            {{ formatPercentage(centralizationData.geographicConcentration) }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Infrastructure Diversity</Text>
          <Text size="14" weight="600" color="primary">
            {{ centralizationData.infrastructureDiversity.toFixed(3) }}
          </Text>
        </Flex>
        
        <!-- Top Providers -->
        <div v-if="centralizationData.topProviders.length > 0" :class="$style.providers_section">
          <Text size="11" color="tertiary" style="margin-bottom: 6px;">Top Providers</Text>
          <div v-for="provider in centralizationData.topProviders" :key="provider.name" :class="$style.provider_item">
            <Text size="10" color="secondary">{{ provider.name.slice(0, 20) }}{{ provider.name.length > 20 ? '...' : '' }}</Text>
            <Text size="10" color="tertiary">{{ provider.validatorCount }} validators</Text>
          </div>
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

.risk_badge {
  &.green {
    background: linear-gradient(var(--green-op-10), var(--green-op-5));
    box-shadow: inset 0 0 0 1px var(--green);
  }
  
  &.yellow {
    background: linear-gradient(var(--yellow-op-10), var(--yellow-op-5));
    box-shadow: inset 0 0 0 1px var(--yellow);
  }
  
  &.red {
    background: linear-gradient(var(--red-op-10), var(--red-op-5));
    box-shadow: inset 0 0 0 1px var(--red);
  }
  
  &.tertiary {
    background: linear-gradient(var(--op-10), var(--op-5));
    box-shadow: inset 0 0 0 1px var(--op-20);
  }
}

.score_bar {
  width: 100%;
  height: 4px;
  background: var(--op-10);
  border-radius: 2px;
  overflow: hidden;
}

.score_progress {
  height: 100%;
  background: linear-gradient(to right, #ef4444, #f59e0b, #10b981);
  transition: width 0.3s ease;
  border-radius: 2px;
}

.divider {
  height: 1px;
  background: var(--op-10);
  margin: 4px 0;
}

.providers_section {
  padding: 8px;
  background: var(--op-5);
  border-radius: 4px;
  margin-top: 4px;
}

.provider_item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 2px 0;
}
</style> 