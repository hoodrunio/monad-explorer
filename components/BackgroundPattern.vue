<template>
	<svg :class="$style.pattern" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
		<defs>
			<pattern id="blockchain-pattern" x="0" y="0" width="100" height="100" patternUnits="userSpaceOnUse">
				<!-- Node circles -->
				<circle cx="20" cy="20" r="2" :fill="patternColor" opacity="0.6" />
				<circle cx="50" cy="35" r="2" :fill="patternColor" opacity="0.6" />
				<circle cx="80" cy="20" r="2" :fill="patternColor" opacity="0.6" />
				<circle cx="35" cy="65" r="2" :fill="patternColor" opacity="0.6" />
				<circle cx="65" cy="80" r="2" :fill="patternColor" opacity="0.6" />

				<!-- Connection lines -->
				<line x1="20" y1="20" x2="50" y2="35" :stroke="patternColor" stroke-width="0.5" opacity="0.3" />
				<line x1="50" y1="35" x2="80" y2="20" :stroke="patternColor" stroke-width="0.5" opacity="0.3" />
				<line x1="50" y1="35" x2="35" y2="65" :stroke="patternColor" stroke-width="0.5" opacity="0.3" />
				<line x1="35" y1="65" x2="65" y2="80" :stroke="patternColor" stroke-width="0.5" opacity="0.3" />

				<!-- Small dots for depth -->
				<circle cx="15" cy="50" r="1" :fill="patternColor" opacity="0.3" />
				<circle cx="70" cy="55" r="1" :fill="patternColor" opacity="0.3" />
				<circle cx="45" cy="15" r="1" :fill="patternColor" opacity="0.3" />
				<circle cx="90" cy="70" r="1" :fill="patternColor" opacity="0.3" />
			</pattern>
		</defs>
		<rect width="100%" height="100%" fill="url(#blockchain-pattern)" />
	</svg>
</template>

<script setup>
const patternColor = "currentColor"
</script>

<style module>
.pattern {
	position: fixed;
	top: 0;
	left: 0;
	width: 100%;
	height: 100%;
	pointer-events: none;
	z-index: 0;
	color: var(--background-pattern);
	opacity: 1;
}
</style>
