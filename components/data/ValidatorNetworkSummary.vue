<script setup>
/** API */
import { fetchValidatorRankings } from "@/services/api/validator"

/** Services */
import { comma, shortHex } from "@/services/utils"

const { data: validatorsData, pending: isLoading, error } = await fetchValidatorRankings({ 
  limit: 10, 
  sortBy: 'uptime_score',
  window: '7d'
})

const topValidators = computed(() => {
  if (!validatorsData.value?.data || !Array.isArray(validatorsData.value.data)) {
    return []
  }
  
  return validatorsData.value.data.map(validator => ({
    rank: validator.rank || 0,
    validatorId: validator.validator_id || '',
    name: validator.infrastructure?.validator_name || shortHex(validator.validator_id || ''),
    uptimeScore: validator.metrics?.uptime_score || 0,
    qcParticipationRate: validator.metrics?.qc_participation_rate || 0,
    blockProposalRatio: validator.metrics?.block_proposal_ratio || 0,
    provider: validator.infrastructure?.provider || 'Unknown',
    location: validator.infrastructure?.location || 'Unknown',
    blocksProposed: validator.details?.blocks_proposed || 0,
    totalBlockOpportunities: validator.details?.total_block_opportunities || 0,
    qcParticipations: validator.details?.qc_participations || 0,
    totalQcOpportunities: validator.details?.total_qc_opportunities || 0
  }))
})

const formatPercentage = (value) => {
  return `${value.toFixed(1)}%`
}

const getPerformanceColor = (score) => {
  if (score >= 99) return 'green'
  if (score >= 95) return 'yellow'
  return 'red'
}
</script>

<template>
  <Flex direction="column" gap="20" :class="$style.wrapper">
    <Flex align="center" justify="between">
      <Flex align="center" gap="8">
        <Icon name="validator" size="16" color="secondary" />
        <Text size="14" weight="600" color="primary">Top Validators (7d)</Text>
      </Flex>
      
      <NuxtLink to="/validators" :class="$style.view_all_link">
        <Text size="12" color="secondary">View All</Text>
      </NuxtLink>
    </Flex>

    <Flex v-if="isLoading" direction="column" gap="12" :class="$style.loading">
      <Text size="12" color="tertiary">Loading validator rankings...</Text>
    </Flex>

    <Flex v-else-if="error" direction="column" gap="12" :class="$style.error">
      <Text size="12" color="red">Error loading validator data</Text>
    </Flex>

    <Flex v-else-if="topValidators.length === 0" direction="column" gap="12" :class="$style.empty">
      <Text size="12" color="tertiary">No validator data available</Text>
    </Flex>

    <div v-else :class="$style.table_scroller">
      <table :class="$style.table">
        <thead>
          <tr>
            <th><Text size="12" weight="600" color="tertiary">Rank</Text></th>
            <th><Text size="12" weight="600" color="tertiary">Validator</Text></th>
            <th><Text size="12" weight="600" color="tertiary">Uptime Score</Text></th>
            <th><Text size="12" weight="600" color="tertiary">QC Rate</Text></th>
            <th><Text size="12" weight="600" color="tertiary">Block Ratio</Text></th>
            <th><Text size="12" weight="600" color="tertiary">Location</Text></th>
          </tr>
        </thead>

        <tbody>
          <tr v-for="validator in topValidators" :key="validator.validatorId">
            <td>
              <Text size="13" weight="600" color="tertiary">#{{ validator.rank }}</Text>
            </td>
            
            <td>
              <NuxtLink :to="`/validator/${validator.validatorId}`" :class="$style.validator_link">
                <Flex direction="column" gap="2">
                  <Text size="13" weight="600" color="primary">{{ validator.name }}</Text>
                  <Text size="11" color="tertiary">{{ validator.provider }}</Text>
                </Flex>
              </NuxtLink>
            </td>
            
            <td>
              <Text size="13" weight="600" :color="getPerformanceColor(validator.uptimeScore)">
                {{ formatPercentage(validator.uptimeScore) }}
              </Text>
            </td>
            
            <td>
              <Text size="13" weight="600" color="primary">
                {{ formatPercentage(validator.qcParticipationRate) }}
              </Text>
            </td>
            
            <td>
              <Text size="13" weight="600" color="primary">
                {{ formatPercentage(validator.blockProposalRatio) }}
              </Text>
            </td>
            
            <td>
              <Text size="12" color="tertiary">{{ validator.location }}</Text>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </Flex>
</template>

<style module>
.wrapper {
  background: var(--card-background);
  border-radius: 12px;
  padding: 16px;
  min-height: 200px;
}

.view_all_link {
  text-decoration: none;
  transition: opacity 0.2s ease;

  &:hover {
    opacity: 0.8;
  }
}

.loading,
.error,
.empty {
  padding: 20px;
  text-align: center;
}

.table_scroller {
  overflow-x: auto;
}

.table {
  width: 100%;
  border-spacing: 0;

  th {
    text-align: left;
    padding: 8px 12px;
    border-bottom: 1px solid var(--op-10);

    &:first-child {
      padding-left: 0;
    }

    &:last-child {
      padding-right: 0;
    }
  }

  td {
    padding: 12px;
    border-bottom: 1px solid var(--op-5);

    &:first-child {
      padding-left: 0;
    }

    &:last-child {
      padding-right: 0;
    }
  }

  tbody tr {
    transition: background-color 0.2s ease;

    &:hover {
      background: var(--op-5);
    }
  }
}

.validator_link {
  text-decoration: none;
}

@media (max-width: 768px) {
  .table_scroller {
    overflow-x: scroll;
  }
}
</style> 