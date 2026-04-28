# Analyzer pattern list naming convention

Date: 2026-04-07
Family: convention/policy
Purpose: One-line answer: use the `brainSeeking<Family>Patterns` shape for every
new non-explicit brain-seeking family in `internal/context/analyzer.go`, and
pair each list with an `applyBrainSeeking<Family>Intent` pass that returns
early when `PreferBrainContext` is already set.

## Convention

When adding a new pattern list to `internal/context/analyzer.go`, our
convention is:

1. Name the variable `brainSeeking<Family>Patterns` (camelCase family tag).
   Examples that already exist: `brainSeekingRationalePatterns`,
   `brainSeekingConventionPatterns`.
2. Keep the phrase list strict. Bare short phrases like `how do we` or
   `did we` are forbidden — they collide with code-explanation questions and
   past-tense noise. Require the longer distinguishing tail.
3. Pair the list with a sibling `applyBrainSeeking<Family>Intent(message,
   needs)` function and wire it into `RuleBasedAnalyzer.AnalyzeTurn` right
   after the previous brain-seeking family.
4. The first line of every such pass must be `if needs.PreferBrainContext
   { return }` so that only one brain_seeking signal fires per turn. First
   family to match wins; later families stay silent.
5. Emit a `brain_seeking_intent` signal with `value` set to the family tag
   (e.g. `rationale`, `convention`) so metrics can distinguish families.

## Policy

Our policy for landing a new brain-seeking family is one slice at a time:
analyzer pattern list + pass + unit tests + one seeded brain note + one live
validation prompt against `http://localhost:8092`. Do NOT batch multiple
families into the same slice. Do NOT touch `retrieval.go` query shaping
unless a fresh live failure makes it necessary.

## Why this matters

The analyzer is the only component that decides whether a turn is
knowledge-seeking vs code-seeking. Drift in the naming scheme or in the
strictness of the phrase lists silently breaks retrieval routing, and that
kind of regression is invisible in unit tests until a live prompt hits a
ghost pattern. Keeping the convention boring keeps the behavior auditable.
