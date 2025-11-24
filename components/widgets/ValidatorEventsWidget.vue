<script setup>
import { computed, ref } from 'vue'
import { DateTime } from 'luxon'

/** API */
import { fetchRecentEvents } from "@/services/api/main"

const { data: eventsData, pending: isLoading, error } = await fetchRecentEvents({ type: 'block_proposal', limit: 8 })

const hoveredEvent = ref(null)

const recentProposalEvents = computed(() => {
  if (!eventsData.value?.events || !Array.isArray(eventsData.value.events)) {
    return []
  }

  return eventsData.value.events.map(event => ({
    id: `${event.validator_id}-${event.round_number}-${event.timestamp}`,
    type: event.event_type || 'unknown',
    validatorId: event.validator_id || 'unknown',
    validatorName: event.infrastructure?.validator_name || 'Unknown',
    timestamp: event.timestamp || new Date().toISOString(),
    roundNumber: event.round_number || 0,
    blockNumber: event.sequence_number || 0,
    status: event.details?.status || '',
    participated: event.details?.participated,
    location: event.infrastructure?.location || 'Unknown'
  }))
})

const getEventIcon = (type, participated = null) => {
  switch (type) {
    case 'block_proposal': return 'check-circle'
    case 'block_skipped': return 'close-circle'
    case 'qc_participation': return participated ? 'check-circle' : 'close-circle'
    default: return 'info'
  }
}

const getEventColor = (type, status, participated) => {
  switch (type) {
    case 'block_proposal': return status === 'proposed' ? '#10B981' : '#6B7280'
    case 'block_skipped': return '#EF4444'
    case 'qc_participation': return participated ? '#10B981' : '#EF4444'
    default: return '#6B7280'
  }
}

const getEventColorName = (type, status, participated) => {
  switch (type) {
    case 'block_proposal': return status === 'proposed' ? 'green' : 'tertiary'
    case 'block_skipped': return 'red'
    case 'qc_participation': return participated ? 'green' : 'red'
    default: return 'tertiary'
  }
}

const getEventDescription = (event) => {
  switch (event.type) {
    case 'block_proposal':
      return event.status === 'proposed' ? 'Block Proposed' : 'Block Proposal'
    case 'block_skipped':
      return 'Block Skipped'
    case 'qc_participation':
      return event.participated ? 'QC Participated' : 'QC Missed'
    default:
      return event.type
  }
}

const formatTime = (timestamp) => {
  try {
    let parsedDate

    if (timestamp.includes('T')) {
      parsedDate = DateTime.fromISO(timestamp, { zone: 'utc' })
    } else {
      parsedDate = DateTime.fromSQL(timestamp, { zone: 'utc' })
    }

    const localDate = parsedDate.toLocal()

    return {
      relative: localDate.toRelative({ locale: "en", style: "short" }),
      absolute: localDate.toFormat("LLL dd, yyyy, HH:mm:ss")
    }
  } catch (error) {
    return {
      relative: 'Unknown',
      absolute: 'Unknown time'
    }
  }
}

const truncateValidator = (name) => {
  if (typeof name !== 'string') return 'Unknown'
  return name.length > 22 ? `${name.slice(0, 22)}...` : name
}
</script>

<template>
  <div :class="$style.wrapper">
    <Flex direction="column" gap="16">
      <Flex align="center" justify="between">
        <Text size="14" weight="600" color="primary">Recent Proposals</Text>
        <NuxtLink to="/validators" :class="$style.view_all_link">
          <Text size="12" color="secondary">View All</Text>
        </NuxtLink>
      </Flex>

      <Flex v-if="isLoading" direction="column" gap="6" style="min-height: 140px; padding-left: 20px;">
        <div v-for="i in 4" :key="i" :class="$style.skeleton_item">
          <div :class="$style.skeleton_dot"></div>
          <div :class="$style.skeleton_content">
            <div :class="$style.skeleton_line"></div>
            <div :class="$style.skeleton_line_small"></div>
          </div>
        </div>
      </Flex>

      <Flex v-else-if="error" direction="column" gap="6" align="center" justify="center" style="min-height: 140px;">
        <Icon name="alert" size="20" color="red" />
        <Text size="11" color="red">Error loading events</Text>
      </Flex>

      <Flex v-else-if="recentProposalEvents.length === 0" direction="column" gap="6" align="center" justify="center" style="min-height: 140px;">
        <Icon name="info" size="20" color="tertiary" />
        <Text size="11" color="tertiary">No recent events</Text>
      </Flex>

      <div v-else :class="$style.timeline">
        <div
          v-for="(event, index) in recentProposalEvents.slice(0, 5)"
          :key="event.id"
          :class="[$style.timeline_item, { [$style.hovered]: hoveredEvent === index }]"
          @mouseenter="hoveredEvent = index"
          @mouseleave="hoveredEvent = null"
        >
          <!-- Timeline Line -->
          <div :class="$style.timeline_line">
            <div
              :class="$style.timeline_line_fill"
              :style="{
                background: `linear-gradient(180deg, ${getEventColor(event.type, event.status, event.participated)}00, ${getEventColor(event.type, event.status, event.participated)})`
              }"
            ></div>
          </div>

          <!-- Timeline Dot -->
          <div :class="$style.timeline_dot_container">
            <div
              :class="[$style.timeline_dot, { [$style.pulsing]: index === 0 }]"
              :style="{
                backgroundColor: getEventColor(event.type, event.status, event.participated),
                boxShadow: hoveredEvent === index ? `0 0 20px ${getEventColor(event.type, event.status, event.participated)}` : `0 0 8px ${getEventColor(event.type, event.status, event.participated)}88`
              }"
            >
              <Icon
                :name="getEventIcon(event.type, event.participated)"
                size="10"
                color="primary"
              />
            </div>
          </div>

          <!-- Content -->
          <div :class="$style.event_content">
            <Flex align="center" justify="between" gap="8">
              <Flex direction="column" gap="2" style="flex: 1; min-width: 0;">
                <Text size="11" weight="600" :color="getEventColorName(event.type, event.status, event.participated)">
                  {{ getEventDescription(event) }}
                </Text>
                <Flex align="center" gap="4">
                  <Text size="10" color="secondary" style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
                    {{ truncateValidator(event.validatorName) }}
                  </Text>
                </Flex>
              </Flex>

              <Flex direction="column" align="end" gap="4" style="flex-shrink: 0;">
                <ClientOnlyTime fallback-text="..." fallback-size="10" fallback-color="secondary">
                  <Text size="10" color="secondary" :class="$style.time_text">
                    {{ formatTime(event.timestamp).relative }}
                  </Text>
                </ClientOnlyTime>
                <Text size="10" color="secondary" :class="$style.block_text">
                  {{ event.blockNumber }}
                </Text>
              </Flex>
            </Flex>
          </div>
        </div>

        <!-- End of timeline indicator -->
        <div :class="$style.timeline_end">
          <div :class="$style.timeline_end_dot"></div>
        </div>
      </div>
    </Flex>
  </div>
</template>

<style module>
.wrapper {
  height: 100%;
  min-height: 220px;
  background: var(--card-background);
  border-radius: 12px;
  padding: 14px;
  position: relative;
  overflow: hidden;
}

.wrapper::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(90deg,
    transparent,
    rgba(16, 185, 129, 0.3) 25%,
    rgba(59, 130, 246, 0.3) 50%,
    rgba(239, 68, 68, 0.3) 75%,
    transparent
  );
  opacity: 0.5;
}

.timeline {
  position: relative;
  padding-left: 20px;
  animation: fadeIn 0.6s ease;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.timeline_item {
  position: relative;
  padding: 6px 0;
  animation: slideInTimeline 0.5s ease backwards;
}

.timeline_item:nth-child(1) { animation-delay: 0.05s; }
.timeline_item:nth-child(2) { animation-delay: 0.1s; }
.timeline_item:nth-child(3) { animation-delay: 0.15s; }
.timeline_item:nth-child(4) { animation-delay: 0.2s; }
.timeline_item:nth-child(5) { animation-delay: 0.25s; }

@keyframes slideInTimeline {
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

.timeline_line {
  position: absolute;
  left: 5px;
  top: 20px;
  bottom: -8px;
  width: 2px;
  background: var(--op-10);
  overflow: hidden;
}

.timeline_line_fill {
  width: 100%;
  height: 100%;
  opacity: 0.6;
}

.timeline_dot_container {
  position: absolute;
  left: 0;
  top: 10px;
}

.timeline_dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  border: 2px solid var(--card-background);
  position: relative;
  z-index: 2;
}

.timeline_dot.pulsing {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
    opacity: 1;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.8;
  }
}

.timeline_item:hover .timeline_dot,
.timeline_item.hovered .timeline_dot {
  transform: scale(1.25);
  border-width: 2px;
}

.event_content {
  margin-left: 24px;
  padding: 6px 10px;
  background: var(--op-5);
  border-radius: 6px;
  border: 1px solid transparent;
  transition: all 0.3s ease;
  cursor: pointer;
}

.timeline_item:hover .event_content,
.timeline_item.hovered .event_content {
  background: var(--op-10);
  border-color: var(--op-10);
  transform: translateX(3px);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

.time_text {
  font-weight: 400;
  letter-spacing: 0.01em;
}

.block_text {
  font-weight: 400;
  letter-spacing: 0.02em;
  font-variant-numeric: tabular-nums;
}

.timeline_end {
  position: relative;
  padding: 4px 0;
  margin-left: 0;
}

.timeline_end_dot {
  position: absolute;
  left: 3px;
  top: 4px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--op-10);
  border: 2px solid var(--card-background);
}

.view_all_link {
  text-decoration: none;
  transition: all 0.2s ease;
  padding: 4px 8px;
  border-radius: 4px;
}

.view_all_link:hover {
  background: var(--op-5);
}

/* Skeleton Loading States */
.skeleton_item {
  position: relative;
  padding: 6px 0;
  display: flex;
  gap: 12px;
  animation: fadeIn 0.3s ease;
}

.skeleton_dot {
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: var(--op-10);
  flex-shrink: 0;
  animation: pulse 1.5s ease-in-out infinite;
}

.skeleton_content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.skeleton_line {
  height: 10px;
  background: linear-gradient(
    90deg,
    var(--op-5) 0%,
    var(--op-10) 50%,
    var(--op-5) 100%
  );
  background-size: 200% 100%;
  border-radius: 3px;
  animation: shimmer 1.5s infinite;
}

.skeleton_line_small {
  height: 8px;
  width: 70%;
  background: linear-gradient(
    90deg,
    var(--op-5) 0%,
    var(--op-10) 50%,
    var(--op-5) 100%
  );
  background-size: 200% 100%;
  border-radius: 3px;
  animation: shimmer 1.5s infinite;
  animation-delay: 0.2s;
}

@keyframes shimmer {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

@media (max-width: 768px) {
  .timeline {
    padding-left: 16px;
  }

  .event_content {
    margin-left: 20px;
    padding: 6px 8px;
  }
}
</style>
