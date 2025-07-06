<template>
  <div :class="[$style.wrapper, $style[size]]">
    <img 
      v-if="logoUrl" 
      :src="logoUrl" 
      :alt="`${validatorName} logo`"
      :class="$style.logo"
      @error="handleImageError"
    />
    <div v-else :class="$style.fallback">
      <Icon name="validator" :size="iconSize" color="tertiary" />
    </div>
  </div>
</template>

<script setup>
const props = defineProps({
  logoUrl: {
    type: String,
    default: null
  },
  validatorName: {
    type: String,
    default: 'Validator'
  },
  size: {
    type: String,
    default: 'medium', // small, medium, large
    validator: (value) => ['small', 'medium', 'large'].includes(value)
  }
})

const emit = defineEmits(['error'])

const iconSize = computed(() => {
  switch (props.size) {
    case 'small': return 12
    case 'medium': return 16
    case 'large': return 20
    default: return 16
  }
})

const handleImageError = () => {
  emit('error')
}
</script>

<style module>
.wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  overflow: hidden;
  background: var(--card-background);
  border: 1px solid var(--border-color);
}

.logo {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  background: var(--op-5);
}

/* Default size */
.wrapper {
  width: 32px;
  height: 32px;
}

/* Size variants */
.wrapper.small {
  width: 24px;
  height: 24px;
}

.wrapper.medium {
  width: 32px;
  height: 32px;
}

.wrapper.large {
  width: 48px;
  height: 48px;
}
</style> 