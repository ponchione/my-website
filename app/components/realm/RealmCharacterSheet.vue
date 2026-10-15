<script setup lang="ts">
import { ChevronRight, X } from '@lucide/vue'
import { character } from '~/data/character'
import { careerHoldings, currentPost, educationHoldings, type Holding } from '~/utils/realm/career'
import { countyByFips } from '~/utils/realm/map-data'

// The full character sheet. Choosing a title or a school closes the sheet and takes
// the map there (handled by the page).

const emit = defineEmits<{
  close: []
  visit: [holding: Holding]
}>()

const closeButton = useTemplateRef<HTMLButtonElement>('closeButton')
onMounted(() => closeButton.value?.focus())

const countyName = (holding: Holding) => {
  const county = countyByFips(holding.fips)
  return county ? `${county.name} County` : ''
}
const span = (holding: Holding) => (holding.start ? `${holding.start} – ${holding.end}` : holding.end)
</script>

<template>
  <aside class="sheet" role="dialog" aria-modal="false" aria-labelledby="sheet-name">
    <button ref="closeButton" type="button" class="sheet-close" aria-label="Close the character sheet" @click="emit('close')">
      <X class="size-5" aria-hidden="true" />
    </button>

    <header class="sheet-header">
      <div class="sheet-portrait">
        <img src="/realm/portrait.webp" alt="Painted portrait of Mitchell Ponchione" width="500" height="600">
        <RealmHeraldicShield class="sheet-portrait-arms" :arms="character.house.arms" />
      </div>
      <div class="sheet-identity">
        <h2 id="sheet-name" class="sheet-name">{{ character.name }}</h2>
        <p class="sheet-epithet">{{ character.epithet }}</p>
        <template v-if="currentPost">
          <p class="sheet-post">{{ currentPost.title }}</p>
          <p class="sheet-muted">{{ currentPost.institution }}</p>
        </template>
        <p class="sheet-house">{{ character.house.name }}</p>
      </div>
    </header>

    <section>
      <h3 class="sheet-rule"><span>Skills</span></h3>
      <ul class="sheet-skills">
        <li v-for="skill in character.skills" :key="skill.name">
          <RealmHint :title="skill.name" :text="skill.meaning" class="sheet-skill">
            <RealmIcon :name="skill.icon" class="sheet-skill-icon" />
            <span class="sheet-skill-name">{{ skill.name }}</span>
            <span class="sheet-skill-value">{{ skill.value }}</span>
          </RealmHint>
        </li>
      </ul>
    </section>

    <section>
      <h3 class="sheet-rule"><span>Titles Held</span></h3>
      <ul class="sheet-titles">
        <li v-for="holding in careerHoldings" :key="holding.id">
          <button type="button" class="sheet-title" @click="emit('visit', holding)">
            <RealmHeraldicShield class="sheet-title-arms" :seed="holding.institution" />
            <span class="sheet-title-text">
              <span class="sheet-title-name">{{ holding.title }}</span>
              <span class="sheet-muted">{{ holding.institution }}</span>
              <span class="sheet-muted">{{ span(holding) }}</span>
            </span>
            <span class="sheet-title-place">
              {{ countyName(holding) }}
              <ChevronRight class="size-4" aria-hidden="true" />
            </span>
          </button>
        </li>
      </ul>
    </section>

    <section v-if="educationHoldings.length">
      <h3 class="sheet-rule"><span>Schooling</span></h3>
      <ul class="sheet-titles">
        <li v-for="holding in educationHoldings" :key="holding.id">
          <button type="button" class="sheet-title" @click="emit('visit', holding)">
            <RealmHeraldicShield class="sheet-title-arms" :seed="holding.institution" />
            <span class="sheet-title-text">
              <span class="sheet-title-name">{{ holding.title }}</span>
              <span class="sheet-muted">{{ holding.institution }}</span>
              <span class="sheet-muted">{{ span(holding) }}</span>
            </span>
            <span class="sheet-title-place">
              {{ countyName(holding) }}
              <ChevronRight class="size-4" aria-hidden="true" />
            </span>
          </button>
        </li>
      </ul>
    </section>

    <section>
      <h3 class="sheet-rule"><span>{{ character.house.name }}</span></h3>
      <div class="sheet-house-card">
        <RealmHeraldicShield class="sheet-house-arms" :arms="character.house.arms" />
        <div>
          <p class="sheet-motto">“{{ character.house.motto }}”</p>
          <p class="sheet-muted">{{ character.house.members }}</p>
        </div>
      </div>
    </section>

    <section>
      <h3 class="sheet-rule"><span>Correspondence</span></h3>
      <ul class="sheet-letters">
        <li v-for="letter in character.correspondence" :key="letter.href">
          <a
            :href="letter.href"
            class="sheet-letter"
            :target="letter.href.startsWith('http') ? '_blank' : undefined"
            :rel="letter.href.startsWith('http') ? 'noopener noreferrer' : undefined"
          >
            <RealmIcon :name="letter.icon" class="size-4" />
            <span>
              <span class="sheet-letter-label">{{ letter.label }}</span>
              <span class="sheet-muted">{{ letter.detail }}</span>
            </span>
          </a>
        </li>
      </ul>
    </section>

    <p class="sheet-footer">
      Prefer plain pages? <NuxtLink to="/about">Take the old road</NuxtLink>.
    </p>
  </aside>
</template>

<style scoped>
.sheet {
  position: absolute;
  top: 16px;
  bottom: 16px;
  left: 16px;
  z-index: 20;
  width: min(480px, calc(100vw - 32px));
  overflow-y: auto;
  padding: 18px 20px 20px;
  border: 1px solid var(--panel-edge);
  border-radius: 4px;
  background:
    linear-gradient(180deg, rgb(255 236 190 / 0.05), transparent 160px),
    linear-gradient(180deg, #2a251e, #17140f);
  box-shadow:
    inset 0 0 0 1px rgb(255 230 170 / 0.06),
    inset 0 0 0 5px rgb(0 0 0 / 0.25),
    inset 0 0 0 6px rgb(184 149 90 / 0.3),
    0 24px 60px rgb(0 0 0 / 0.6);
  user-select: text;
  animation: sheet-in 220ms ease-out;
}

.sheet-close {
  position: absolute;
  top: 12px;
  right: 12px;
  color: var(--ink-muted);
}

.sheet-close:hover,
.sheet-close:focus-visible {
  color: var(--gold);
  outline: none;
}

.sheet-header {
  display: flex;
  gap: 18px;
  align-items: flex-start;
}

.sheet-portrait {
  position: relative;
  flex-shrink: 0;
  width: 150px;
  height: 180px;
  border: 1px solid #8a6f3e;
  box-shadow: 0 0 0 3px #1a1610, 0 0 0 4px rgb(184 149 90 / 0.55), 0 10px 24px rgb(0 0 0 / 0.5);
}

.sheet-portrait img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sheet-portrait-arms {
  position: absolute;
  right: -14px;
  bottom: -14px;
  width: 44px;
}

.sheet-identity {
  display: grid;
  gap: 2px;
  padding-top: 6px;
  padding-right: 24px;
}

.sheet-name {
  font-family: Cinzel, Georgia, serif;
  font-weight: 700;
  font-size: 23px;
  line-height: 1.15;
  letter-spacing: 0.04em;
  color: var(--gold);
}

.sheet-epithet {
  margin-bottom: 8px;
  font-style: italic;
  color: var(--ink-muted);
}

.sheet-post {
  font-weight: 600;
  line-height: 1.2;
}

.sheet-house {
  margin-top: 8px;
  font-family: Cinzel, Georgia, serif;
  font-size: 13px;
  font-weight: 600;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.sheet-muted {
  display: block;
  color: var(--ink-muted);
  line-height: 1.25;
}

.sheet-rule {
  display: flex;
  align-items: center;
  gap: 10px;
  margin: 20px 0 10px;
  font-family: Cinzel, Georgia, serif;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--ink-muted);
}

.sheet-rule::before,
.sheet-rule::after {
  content: "";
  flex: 1;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--gold-dim), transparent);
}

.sheet-skills {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.sheet-skill {
  display: flex;
  align-items: center;
  gap: 6px;
  width: 100%;
  padding: 6px 8px;
  border: 1px solid #4e4129;
  border-radius: 3px;
  background: rgb(0 0 0 / 0.2);
}

.sheet-skill-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  color: var(--gold);
}

.sheet-skill-name {
  overflow: hidden;
  font-size: 15px;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--ink-muted);
}

.sheet-skill-value {
  margin-left: auto;
  font-family: Cinzel, Georgia, serif;
  font-size: 17px;
  font-weight: 700;
  color: var(--ink);
}

.sheet-titles {
  display: grid;
  gap: 6px;
}

.sheet-title {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 8px 10px;
  border: 1px solid #4e4129;
  border-radius: 3px;
  background: rgb(0 0 0 / 0.18);
  text-align: left;
  transition: border-color 150ms ease, background 150ms ease;
}

.sheet-title:hover,
.sheet-title:focus-visible {
  border-color: var(--gold);
  background: rgb(217 181 107 / 0.07);
  outline: none;
}

.sheet-title-arms {
  width: 30px;
  flex-shrink: 0;
}

.sheet-title-text {
  display: grid;
  min-width: 0;
}

.sheet-title-name {
  font-weight: 600;
  line-height: 1.2;
  color: var(--ink);
}

.sheet-title-place {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  flex-shrink: 0;
  font-family: Cinzel, Georgia, serif;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--gold);
}

.sheet-house-card {
  display: flex;
  gap: 14px;
  align-items: center;
}

.sheet-house-arms {
  width: 54px;
  flex-shrink: 0;
}

.sheet-motto {
  font-style: italic;
  color: var(--ink);
}

.sheet-letters {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
}

.sheet-letter {
  display: flex;
  gap: 8px;
  height: 100%;
  padding: 8px 10px;
  border: 1px solid #5a4a2e;
  border-radius: 3px;
  background: linear-gradient(180deg, #2f2920, #221e17);
  color: var(--ink);
  text-decoration: none;
  line-height: 1.2;
}

.sheet-letter svg {
  flex-shrink: 0;
  margin-top: 2px;
  color: var(--gold);
}

.sheet-letter-label {
  display: block;
  font-weight: 600;
  color: var(--gold);
}

.sheet-letter .sheet-muted {
  font-size: 14px;
  overflow-wrap: anywhere;
}

.sheet-letter:hover,
.sheet-letter:focus-visible {
  border-color: var(--gold);
  outline: none;
}

.sheet-footer {
  margin-top: 20px;
  text-align: center;
  font-size: 15px;
  font-style: italic;
  color: var(--ink-muted);
}

.sheet-footer a {
  color: var(--ink);
  text-decoration: underline;
  text-decoration-color: var(--gold-dim);
  text-underline-offset: 3px;
}

.sheet-footer a:hover {
  color: var(--gold);
}

@keyframes sheet-in {
  from { opacity: 0; transform: translateX(-12px); }
  to { opacity: 1; transform: none; }
}

@media (max-width: 640px) {
  .sheet {
    top: 8px;
    bottom: 8px;
    left: 8px;
    width: calc(100vw - 16px);
    padding: 14px;
  }

  .sheet-portrait {
    width: 110px;
    height: 132px;
  }

  .sheet-skills,
  .sheet-letters {
    grid-template-columns: repeat(2, 1fr);
  }

  /* The county moves under the title instead of squeezing it. */
  .sheet-title {
    flex-wrap: wrap;
    row-gap: 4px;
  }

  .sheet-title-text {
    flex: 1;
  }

  .sheet-title-place {
    width: 100%;
    justify-content: flex-end;
  }
}

@media (prefers-reduced-motion: reduce) {
  .sheet {
    animation: none;
  }

  .sheet-title {
    transition: none;
  }
}
</style>
