<script setup>
import { ref, computed } from 'vue'

/** API */
// This would fetch from the /validators/stats endpoint
const validatorStats = ref({
  totalValidators: 150,
  activeValidators: 142,
  averageUptimeScore: 95.7,
  averageQcParticipationRate: 92.3,
  averageBlockProposalRatio: 0.67,
  totalConsensusRounds: 12457,
  averageReputationScore: 87.2
})

const formatPercentage = (value) => {
  return `${value.toFixed(1)}%`
}

const formatRatio = (value) => {
  return (value * 100).toFixed(1) + '%'
}
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Text size="14" weight="600" color="primary">Network Statistics</Text>
      
      <Flex direction="column" gap="12">
        <!-- Total/Active Validators -->
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Total Validators</Text>
          <Text size="14" weight="600" color="primary">
            {{ validatorStats.totalValidators }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Active Validators</Text>
          <Text size="14" weight="600" color="green">
            {{ validatorStats.activeValidators }}
          </Text>
        </Flex>
        
        <!-- Divider -->
        <div :class="$style.divider"></div>
        
        <!-- Performance Metrics -->
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Avg Uptime Score</Text>
          <Text size="14" weight="600" color="primary">
            {{ formatPercentage(validatorStats.averageUptimeScore) }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Avg QC Participation</Text>
          <Text size="14" weight="600" color="primary">
            {{ formatPercentage(validatorStats.averageQcParticipationRate) }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Avg Block Proposal</Text>
          <Text size="14" weight="600" color="primary">
            {{ formatRatio(validatorStats.averageBlockProposalRatio) }}
          </Text>
        </Flex>
        
        <!-- Divider -->
        <div :class="$style.divider"></div>
        
        <!-- Network Activity -->
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Consensus Rounds</Text>
          <Text size="14" weight="600" color="primary">
            {{ validatorStats.totalConsensusRounds.toLocaleString() }}
          </Text>
        </Flex>
        
        <Flex align="center" justify="between">
          <Text size="12" color="tertiary">Avg Reputation</Text>
          <Text size="14" weight="600" color="primary">
            {{ validatorStats.averageReputationScore.toFixed(1) }}
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