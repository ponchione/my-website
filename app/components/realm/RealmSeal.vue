<script setup lang="ts">
// A wax seal pressed with the house keystone. A broken seal is split along a crack, its
// halves swung apart; turning `broken` on animates the break.

defineProps<{ broken?: boolean }>()

const id = useId()

// The crack runs top to bottom; each half is clipped to one side of it.
const CRACK = 'L48,17 L56,33 L47,50 L55,66 L46,83 L52,100'
</script>

<template>
  <svg viewBox="0 0 100 100" class="seal" :class="{ 'seal-broken': broken }" aria-hidden="true">
    <defs>
      <radialGradient :id="`${id}-wax`" cx="0.38" cy="0.32" r="0.75">
        <stop offset="0" stop-color="#c84a3c" />
        <stop offset="0.55" stop-color="#982a21" />
        <stop offset="1" stop-color="#5a150f" />
      </radialGradient>
      <clipPath :id="`${id}-left`">
        <path :d="`M0,0 H53 ${CRACK} H0 Z`" />
      </clipPath>
      <clipPath :id="`${id}-right`">
        <path :d="`M53,0 H100 V100 H52 L46,83 L55,66 L47,50 L56,33 L48,17 Z`" />
      </clipPath>
      <g :id="`${id}-wax-body`">
        <!-- The pool of wax, uneven where it spread past the stamp. -->
        <g :fill="`url(#${id}-wax)`">
          <circle cx="50" cy="50" r="43" />
          <circle cx="20" cy="27" r="11" />
          <circle cx="82" cy="24" r="9" />
          <circle cx="88" cy="58" r="10" />
          <circle cx="66" cy="88" r="10" />
          <circle cx="24" cy="80" r="12" />
          <circle cx="9" cy="52" r="7" />
        </g>
        <!-- The stamp's impression: a sunken disc, its rim, and the keystone raised in it. -->
        <circle cx="50" cy="50" r="31" fill="rgb(60 10 6 / 0.28)" />
        <circle cx="50" cy="50" r="33" fill="none" stroke="#5a140e" stroke-width="3" />
        <circle cx="50" cy="50" r="35" fill="none" stroke="rgb(255 190 170 / 0.28)" stroke-width="1.2" />
        <path d="M35,33 Q50,28 65,33 L58,69 L42,69 Z" fill="#a8352a" stroke="#5a140e" stroke-width="1.6" />
        <path d="M36.5,34.5 Q50,30 63.5,34.5" fill="none" stroke="rgb(255 200 180 / 0.45)" stroke-width="1.2" />
        <ellipse cx="34" cy="26" rx="11" ry="5" fill="rgb(255 255 255 / 0.13)" transform="rotate(-28 34 26)" />
      </g>
    </defs>
    <g class="seal-half seal-left" :clip-path="`url(#${id}-left)`">
      <use :href="`#${id}-wax-body`" />
    </g>
    <g class="seal-half seal-right" :clip-path="`url(#${id}-right)`">
      <use :href="`#${id}-wax-body`" />
    </g>
  </svg>
</template>

<style scoped>
.seal {
  display: block;
  overflow: visible;
  filter: drop-shadow(0 2px 3px rgb(0 0 0 / 0.45));
}

/* The halves pivot at the foot of the crack, as if pried open from the top. */
.seal-half {
  transform-origin: 50px 100px;
  transition: transform 380ms cubic-bezier(0.3, 0.7, 0.3, 1.25);
}

.seal-broken .seal-left {
  transform: translate(-5px, 3px) rotate(-15deg);
}

.seal-broken .seal-right {
  transform: translate(5px, 4px) rotate(12deg);
}

@media (prefers-reduced-motion: reduce) {
  .seal-half {
    transition: none;
  }
}
</style>
