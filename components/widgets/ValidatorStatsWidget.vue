<script setup>
import { ref, computed } from 'vue'

/** API */
import { fetchNetworkSummary } from "@/services/api/main"

const { data: summaryData, pending: isLoading, error } = await fetchNetworkSummary()

const validatorStats = computed(() => {
  if (!summaryData.value?.summary) {
    // Fallback data while loading
    return {
      uniqueValidators: 0,
      eventTypes: 0,
      activeDays: 0,
      totalProposals: 0,
      successfulProposals: 0,
      blockSuccessRate: 0,
      totalParticipations: 0,
      successfulParticipations: 0,
      qcSuccessRate: 0,
      avgNetworkParticipationRate: 0
    }
  }
  
  const summary = summaryData.value.summary
  return {
    uniqueValidators: summary.unique_validators || 0,
    eventTypes: summary.event_types || 0,
    activeDays: summary.active_days || 0,
    totalProposals: summary.block_proposal_metrics?.total_proposals || 0,
    successfulProposals: summary.block_proposal_metrics?.successful_proposals || 0,
    blockSuccessRate: summary.block_proposal_metrics?.success_rate || 0,
    totalParticipations: summary.qc_participation_metrics?.total_participations || 0,
    successfulParticipations: summary.qc_participation_metrics?.successful_participations || 0,
    qcSuccessRate: summary.qc_participation_metrics?.success_rate || 0,
    avgNetworkParticipationRate: summary.qc_participation_metrics?.avg_network_participation_rate || 0
  }
})

const formatPercentage = (value) => {
  return `${value.toFixed(1)}%`
}
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Text size="14" weight="600" color="primary">Network Statistics</Text>
      
      <Flex v-if="isLoading" direction="column" gap="12">
        <Text size="12" color="tertiary">Loading network statistics...</Text>
      </Flex>
      
      <Flex v-else-if="error" direction="column" gap="12">
        <Text size="12" color="red">Error loading statistics</Text>
      </Flex>
      
      <Flex v-else direction="column" gap="12">
        <!-- Validator Info -->
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Active Validators</Text>
          <Text size="14" weight="600" color="primary">
            {{ validatorStats.uniqueValidators }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Event Types</Text>
          <Text size="14" weight="600" color="primary">
            {{ validatorStats.eventTypes }}
          </Text>
        </Flex>
        
        <!-- Divider -->
        <div :class="$style.divider"></div>
        
        <!-- Block Metrics -->
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Block Success Rate</Text>
          <Text size="14" weight="600" color="primary">
            {{ formatPercentage(validatorStats.blockSuccessRate) }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Total Proposals</Text>
          <Text size="14" weight="600" color="primary">
            {{ validatorStats.totalProposals.toLocaleString("en-US") }}
          </Text>
        </Flex>
        
        <!-- Divider -->
        <div :class="$style.divider"></div>
        
        <!-- QC Metrics -->
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">QC Success Rate</Text>
          <Text size="14" weight="600" color="primary">
            {{ formatPercentage(validatorStats.qcSuccessRate) }}
          </Text>
        </Flex>
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

.divider {
  height: 1px;
  background: var(--op-10);
  margin: 4px 0;
}
</style> 