<script setup lang="ts">
import type { BlogCollectionItem } from '@nuxt/content'
import { character } from '~/data/character'
import { formatDispatchDate, type Dispatch } from '~/utils/realm/dispatches'

// A blog post with its seal broken: the whole letter on parchment, over the map.

defineProps<{
  post: BlogCollectionItem
  // The next letter still sealed, if any.
  next: Dispatch | null
  // Opened from the letter case, so closing goes back there.
  fromCase: boolean
}>()

const emit = defineEmits<{
  close: []
  next: [path: string]
  case: []
}>()

const dialog = useTemplateRef<HTMLElement>('dialog')

useModalFocus(dialog)
</script>

<template>
  <div class="letter-backdrop">
    <div
      ref="dialog"
      class="letter-frame"
      role="dialog"
      aria-modal="true"
      aria-labelledby="letter-title"
      tabindex="-1"
      @click.self="emit('close')"
    >
      <button type="button" class="letter-close" aria-label="Close the letter" @click="emit('close')">×</button>
      <article class="letter">
        <header>
          <p class="letter-dateline">{{ formatDispatchDate(post.date) }}</p>
          <h1 id="letter-title" class="letter-title">{{ post.title }}</h1>
          <p class="letter-meta">
            {{ post.readingTime }}<template v-if="post.tags.length"> · {{ post.tags.join(', ') }}</template>
          </p>
          <div class="letter-flourish" aria-hidden="true" />
        </header>

        <ContentRenderer :value="post" class="letter-body" />

        <footer class="letter-sign">
          <p class="letter-signature">{{ character.name }}</p>
          <RealmHeraldicShield class="letter-arms" :arms="character.house.arms" />
        </footer>

        <div class="letter-options">
          <a
            v-if="next"
            :href="next.path"
            class="letter-option letter-option-primary"
            @click.prevent="emit('next', next.path)"
          >
            Open the next sealed letter
          </a>
          <a v-if="!fromCase" href="/blog" class="letter-option" @click.prevent="emit('case')">
            Look through the letter case
          </a>
          <button type="button" class="letter-option" @click="emit('close')">
            {{ fromCase ? 'Return to the letter case' : 'Return to the map' }}
          </button>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
/* The letter scrolls like a page, with the map dimmed behind it. */
.letter-backdrop {
  position: absolute;
  inset: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  background: radial-gradient(ellipse at center, rgb(0 0 0 / 0.45), rgb(0 0 0 / 0.75));
  user-select: text;
}

.letter-frame {
  min-height: 100%;
  padding: 48px 16px 56px;
  outline: none;
}

.letter-close {
  position: fixed;
  top: 14px;
  right: 24px;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border: 1px solid var(--panel-edge);
  border-radius: 50%;
  background: var(--panel);
  box-shadow: 0 6px 18px rgb(0 0 0 / 0.5);
  font-size: 26px;
  line-height: 1;
  color: var(--ink-muted);
}

.letter-close:hover,
.letter-close:focus-visible {
  border-color: var(--gold);
  color: var(--gold);
  outline: none;
}

.letter {
  --paper-ink: #2e2318;
  --paper-muted: #6e5839;
  --paper-rule: #a88b58;
  --paper-red: #7e2a1d;

  width: min(720px, 100%);
  margin: 0 auto;
  padding: 40px 60px 36px;
  border-radius: 2px;
  /* Parchment: lighter where the light falls, browned toward the edges, with a grain. */
  background:
    radial-gradient(ellipse 80% 50% at 50% 0%, rgb(255 249 228 / 0.6), transparent),
    radial-gradient(ellipse 120% 60% at 50% 100%, rgb(122 86 40 / 0.22), transparent),
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='220' height='220'%3E%3Cfilter id='g'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='3' stitchTiles='stitch'/%3E%3CfeColorMatrix values='0 0 0 0 0.36 0 0 0 0 0.26 0 0 0 0 0.12 0 0 0 0.16 0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23g)'/%3E%3C/svg%3E"),
    #e4d5b0;
  box-shadow:
    inset 0 0 80px rgb(112 76 30 / 0.38),
    inset 0 0 0 1px rgb(112 80 40 / 0.35),
    0 30px 80px rgb(0 0 0 / 0.65);
  color: var(--paper-ink);
  font-size: 20px;
  line-height: 1.6;
  animation: letter-unfold 520ms cubic-bezier(0.2, 0.7, 0.2, 1) both;
}

.letter-dateline {
  text-align: right;
  font-style: italic;
  color: var(--paper-muted);
}

.letter-title {
  margin-top: 10px;
  font-family: Cinzel, Georgia, serif;
  font-size: 30px;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.02em;
  color: #3b2817;
  text-wrap: balance;
}

.letter-meta {
  margin-top: 6px;
  font-size: 17px;
  font-style: italic;
  color: var(--paper-muted);
}

/* A rule with a lozenge at its middle. */
.letter-flourish {
  position: relative;
  height: 1px;
  margin: 22px 0 26px;
  background: linear-gradient(90deg, transparent, var(--paper-rule) 20%, var(--paper-rule) 80%, transparent);
}

.letter-flourish::after {
  content: "";
  position: absolute;
  top: -4px;
  left: calc(50% - 4px);
  width: 9px;
  height: 9px;
  background: #e4d5b0;
  border: 1px solid var(--paper-rule);
  transform: rotate(45deg);
}

.letter-body :deep(p) {
  margin: 0 0 1em;
  text-wrap: pretty;
}

/* The opening letter, set large in red ink. */
.letter-body > :deep(p:first-child)::first-letter {
  float: left;
  margin: 0.06em 0.1em 0 0;
  font-family: Cinzel, Georgia, serif;
  font-size: 3.9em;
  font-weight: 700;
  line-height: 0.82;
  color: var(--paper-red);
}

/* A heading is a rule through the page, like the sections of a record. */
.letter-body :deep(h2),
.letter-body :deep(h3) {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 1.7em 0 0.9em;
  font-family: Cinzel, Georgia, serif;
  font-size: 15px;
  font-weight: 700;
  line-height: 1.35;
  letter-spacing: 0.13em;
  text-align: center;
  text-transform: uppercase;
  color: var(--paper-red);
}

.letter-body :deep(h2)::before,
.letter-body :deep(h2)::after,
.letter-body :deep(h3)::before,
.letter-body :deep(h3)::after {
  content: "";
  flex: 1;
  min-width: 20px;
  height: 1px;
  background: linear-gradient(90deg, transparent, var(--paper-rule), transparent);
}

.letter-body :deep(h3) {
  font-size: 13px;
}

.letter-body :deep(a) {
  color: var(--paper-red);
  text-decoration: underline;
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
}

.letter-body :deep(strong) {
  font-weight: 600;
}

.letter-body :deep(:is(ul, ol)) {
  margin: 0 0 1em;
  padding-left: 1.4em;
}

.letter-body :deep(ul) {
  list-style: disc;
}

.letter-body :deep(ol) {
  list-style: decimal;
}

.letter-body :deep(li) {
  margin: 0.3em 0;
}

.letter-body :deep(blockquote) {
  margin: 0 0 1em;
  padding-left: 16px;
  border-left: 2px solid var(--paper-rule);
  font-style: italic;
}

.letter-body :deep(code) {
  padding: 0.1em 0.3em;
  border-radius: 2px;
  background: rgb(60 40 15 / 0.08);
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: 0.8em;
}

.letter-body :deep(hr) {
  height: 1px;
  margin: 1.6em 15%;
  border: 0;
  background: linear-gradient(90deg, transparent, var(--paper-rule), transparent);
}

.letter-body :deep(img) {
  max-width: 100%;
  height: auto;
  margin: 0 auto 1em;
}

.letter-sign {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 14px;
  margin-top: 26px;
}

.letter-signature {
  font-size: 28px;
  font-style: italic;
  color: #3b2817;
}

.letter-arms {
  width: 38px;
}

.letter-options {
  display: grid;
  gap: 8px;
  margin-top: 26px;
  padding-top: 22px;
  border-top: 1px solid rgb(168 139 88 / 0.6);
}

.letter-option {
  display: block;
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgb(110 80 40 / 0.45);
  border-radius: 3px;
  background: rgb(255 250 232 / 0.35);
  text-align: left;
  font-size: 18px;
  line-height: 1.35;
  color: var(--paper-ink);
  text-decoration: none;
  transition: border-color 150ms ease, background 150ms ease;
}

.letter-option:hover,
.letter-option:focus-visible {
  border-color: var(--paper-red);
  background: rgb(126 42 29 / 0.07);
  outline: none;
}

.letter-option-primary {
  font-weight: 600;
  color: var(--paper-red);
}

/* The sheet unrolls from the top. */
@keyframes letter-unfold {
  from {
    clip-path: inset(-150px -150px 100% -150px);
    transform: translateY(-10px);
  }

  to {
    clip-path: inset(-150px);
    transform: none;
  }
}

@media (max-width: 640px) {
  .letter-frame {
    padding: 60px 8px 32px;
  }

  .letter-close {
    top: 10px;
    right: 12px;
  }

  .letter {
    padding: 26px 22px 24px;
    font-size: 18px;
  }

  .letter-title {
    font-size: 24px;
  }

  /* Too narrow for rules either side of a heading that wraps: one rule above it instead. */
  .letter-body :deep(h2),
  .letter-body :deep(h3) {
    flex-direction: column;
    gap: 10px;
  }

  .letter-body :deep(h2)::before,
  .letter-body :deep(h3)::before {
    flex: none;
    width: 60%;
  }

  .letter-body :deep(h2)::after,
  .letter-body :deep(h3)::after {
    display: none;
  }

  .letter-signature {
    font-size: 24px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .letter {
    animation: none;
  }

  .letter-option {
    transition: none;
  }
}
</style>
