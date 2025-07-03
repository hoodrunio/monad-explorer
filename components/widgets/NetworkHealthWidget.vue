<script setup>
import { computed, ref } from 'vue'

/** UI */
import Badge from "@/components/ui/Badge.vue"

/** API */
import { fetchNetworkSummary } from "@/services/api/main"

const { data: networkData, pending: isLoading, error } = await fetchNetworkSummary()

const networkHealth = computed(() => {
  if (!networkData.value?.summary) {
    // Fallback data while loading
    return {
      uniqueValidators: 0,
      totalEvents: 0,
      overallSuccessRate: 0,
      blockSuccessRate: 0,
      qcSuccessRate: 0,
      activeDays: 0
    }
  }
  
  const summary = networkData.value.summary
  return {
    uniqueValidators: summary.unique_validators || 0,
    totalEvents: summary.total_events || 0,
    overallSuccessRate: summary.overall_success_rate || 0,
    blockSuccessRate: summary.block_proposal_metrics?.success_rate || 0,
    qcSuccessRate: summary.qc_participation_metrics?.success_rate || 0,
    activeDays: summary.active_days || 0
  }
})

const healthPercentage = computed(() => {
  return networkHealth.value.overallSuccessRate || 0
})

const statusColor = computed(() => {
  if (isLoading.value) return 'tertiary'
  if (error.value) return 'red'
  if (healthPercentage.value >= 75) return 'green'
  if (healthPercentage.value <= 70) return 'yellow'
  return 'red'
})

const displayStatus = computed(() => {
  if (isLoading.value) return 'Loading...'
  if (error.value) return 'Error'
  if (healthPercentage.value >= 75) return 'Healthy'
  if (healthPercentage.value <= 70) return 'Warning'
  return 'Critical'
})
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Flex align="center" justify="between">
        <Text size="14" weight="600" color="primary">Network Health</Text>
        <Badge :class="[$style.status_badge, $style[statusColor]]">
          <Text size="12" weight="600" color="primary">{{ displayStatus }}</Text>
        </Badge>
      </Flex>
      
      <Flex direction="column" gap="12">
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Active Validators</Text>
          <Text size="14" weight="600" color="primary">
            {{ networkHealth.uniqueValidators }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Total Events</Text>
          <Text size="14" weight="600" color="primary">
            {{ networkHealth.totalEvents.toLocaleString("en-US") }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Overall Success Rate</Text>
          <Text size="14" weight="600" color="primary">
            {{ networkHealth.overallSuccessRate.toFixed(1) }}%
          </Text>
        </Flex>
        
        <!-- Health Progress Bar -->
        <div :class="$style.health_bar">
          <div :class="$style.health_progress" :style="{ width: `${healthPercentage}%` }"></div>
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

.status_badge {
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

.health_bar {
  width: 100%;
  height: 4px;
  background: var(--op-10);
  border-radius: 2px;
  overflow: hidden;
}

.health_progress {
  height: 100%;
  background: var(--brand);
  transition: width 0.3s ease;
  border-radius: 2px;
}
</style> 