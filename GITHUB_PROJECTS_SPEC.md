# Live GitHub Project Metadata Specification

Status: Implemented

## Summary

Enhance the `/projects` page so its curated project cards refresh factual
repository metadata from GitHub when the page loads. The site will remain a
fully static Nuxt application deployed through the existing Cloudflare setup.

`app/data/projects.json` remains the source of truth for which projects appear,
their order, display names, editorial lifecycle statuses, and curated
technology tags. GitHub supplies the repository description, primary language,
topics, URL, and last-push timestamp. Live technology metadata is merged with
the curated tags so an incomplete GitHub topic list cannot remove intended
badges. The existing local values remain as a no-JavaScript and request-failure
fallback.

This is progressive enhancement: the page must remain complete and usable
without a successful GitHub request.

## Confirmed product decisions

- Fetch GitHub metadata directly in the browser after the static page renders.
- Keep the current static Nuxt generation and Cloudflare deployment model.
- Make one unauthenticated request for Mitchell's public repositories; do not
  expose or require a GitHub token.
- Continue using `projects.json` as the allowlist and display-order source. Do
  not automatically render every repository returned by GitHub.
- Keep each card minimal:
  - display name and GitHub link;
  - editorial lifecycle badge;
  - short description;
  - `Last pushed` date;
  - technology badges.
- Merge GitHub's language and topics with the curated local tags; repository
  topics are supplemental metadata, not a release dependency.
- Do not add stars, forks, issue counts, releases, commit messages, activity
  charts, or contribution statistics.
- Do not infer `In Progress`, `V1`, `Complete`, or `Deprecated` from commit
  recency. Those labels remain editorial data.

No product questions remain open for the first implementation.

## Goals

- Remove the need to manually update the visible repository description,
  primary language, or last-push date after normal repository work while
  retaining deliberately curated secondary technology tags.
- Preserve deliberate control over the projects shown on the site.
- Preserve the current minimal, content-first card layout.
- Avoid adding a server route, Cloudflare data store, scheduled job, secret, or
  authenticated GitHub integration.
- Fail safely when GitHub is unavailable or rate-limits a visitor.
- Avoid an empty or placeholder-driven layout shift while live metadata is
  loading. Natural card-height changes after real descriptions or tags replace
  the fallback content are acceptable.

## Non-goals

- Automatically discovering new portfolio projects.
- Showing private repositories.
- Treating GitHub activity as a reliable project lifecycle status.
- Displaying a complete GitHub activity feed.
- Updating the static fallback data during builds.
- Replacing the existing Cloudflare static deployment with SSR.
- Adding Octokit or another GitHub client dependency for a single request.

## Existing implementation

- `app/pages/projects.vue` imports `app/data/projects.json` and renders one
  `ProjectListing` for every array entry.
- `app/components/ProjectListing.vue` renders all card content directly from a
  `PersonalProject` object.
- `app/types/index.ts` defines the `PersonalProject` contract.
- `app/data/projects.json` currently stores display names, descriptions,
  human-formatted update dates, technology tags, statuses, and GitHub URLs.
- `nuxt generate` prerenders the site, and Wrangler deploys `.output/public` as
  static assets.

## Data ownership

### Locally curated data

The order of objects in `projects.json` is the card order. An entry's presence
in the file is the sole condition for rendering that repository.

Local data owns:

- `id`;
- display `name`;
- editorial `status`;
- `github_url`, which identifies the repository and provides a fallback link;
- fallback `description`;
- curated fallback and supplemental technology `tags`;
- fallback last-push timestamp.

The local display name remains authoritative because names such as "AI Agent
Conductor" may intentionally differ from the GitHub repository slug.

As part of implementation, replace the ambiguous `updated` field with
`last_pushed_at` and store an ISO 8601 timestamp rather than a preformatted
month string. Capture the then-current GitHub `pushed_at` values as the initial
fallback snapshot.

Conceptual local shape:

```ts
export type PersonalProject = {
  id: number
  name: string
  description: string
  last_pushed_at: string
  tags: string[]
  status: 'In Progress' | 'Planned' | 'Complete' | 'V1' | 'Deprecated'
  github_url: string
}
```

### Live GitHub data

Only model the response fields used by this feature:

```ts
export type GitHubRepository = {
  name: string
  full_name: string
  html_url: string
  description: string | null
  pushed_at: string | null
  language: string | null
  topics: string[]
  archived: boolean
}
```

`archived` may be retained in the response type for future use, but it must not
override the locally curated lifecycle badge in this version. GitHub archival
and this site's `Deprecated` or `Complete` labels express different decisions.

### Resolved card data

Create resolved view data rather than mutating the imported JSON objects. A
resolved project uses the same display-facing shape as a local project, plus
an optional metadata-source indicator if useful internally for tests.

For each allowlisted project:

| Field | Successful GitHub match | No match or request failure |
| --- | --- | --- |
| `id` | Local | Local |
| `name` | Local | Local |
| `status` | Local | Local |
| `github_url` | GitHub `html_url` | Local |
| `description` | Non-empty GitHub description | Local |
| `last_pushed_at` | Valid GitHub `pushed_at` | Local |
| `tags` | GitHub language plus topics, then local tags | Local |

If GitHub returns a matching repository with a null or blank description, keep
the local description. Deduplicate the merged live and local tags
case-insensitively while preserving live-first order. If GitHub returns no
language and no topics, keep the local tags. Invalid or missing timestamps also
retain the local timestamp.

## GitHub request

Use the public REST endpoint:

```text
GET https://api.github.com/users/ponchione/repos
    ?type=owner
    &sort=updated
    &direction=desc
    &per_page=100
```

Request requirements:

- Start the request only in the browser, such as from `onMounted`; the static
  generation command must not depend on GitHub availability.
- Send `Accept: application/vnd.github+json`.
- Send `X-GitHub-Api-Version: 2026-03-10` so response behavior does not change
  when GitHub advances the default REST API version.
- Do not send an `Authorization` header or embed a token.
- Abort the request after approximately five seconds.
- Make at most one network request per hydrated application instance.
- Treat non-2xx responses, invalid JSON, timeouts, and network errors as a
  normal fallback condition.

The endpoint returns up to 100 repositories. This is sufficient for the
current account and keeps the integration to one request. If the account later
exceeds 100 public repositories and an allowlisted repository is missing from
the response, the local fallback continues working. Pagination is a future
enhancement and should only be added when required.

GitHub supports browser CORS requests to its REST API. Unauthenticated REST
requests are limited per originating IP, so the implementation must retain the
local fallback and browser cache.

## Repository matching

Match repositories by normalized full name, not by display name:

1. Parse each local `github_url` with `URL`.
2. Accept only `https://github.com/{owner}/{repository}` URLs.
3. Remove an optional trailing slash and `.git` suffix.
4. Construct the lowercased `{owner}/{repository}` key.
5. Match it against lowercased GitHub `full_name`.

For both local and live URLs, `github.com` must be the exact hostname. Reject
credentials, non-default ports, query strings, fragments, and paths that do not
contain exactly an owner and repository. A valid live `html_url` must normalize
to the same repository key as both its response object's `full_name` and the
matched local project. If it does not, retain the local `github_url`; other
individually valid metadata fields from that response object may still enrich
the card.

Never render a GitHub repository that has no matching local configuration
entry. Preserve local array order after merging; GitHub response order must not
affect the page.

If a local URL is malformed, keep that project's local data and avoid failing
the rest of the page.

## Technology badge rules

When live data is available for a repository:

1. Put GitHub's primary `language` first when present.
2. Append all GitHub topics in the order returned.
3. Remove blank values.
4. Deduplicate case-insensitively while preserving the first value.
5. Exclude the organizational topic `portfolio` if it is ever added; it is not
   a technology.
6. Convert these known topic slugs to their conventional display spellings:
   - `sqlite` -> `SQLite`;
   - `lancedb` -> `LanceDB`;
   - `llama-cpp` -> `llama.cpp`;
   - `fastapi` -> `FastAPI`.
7. For all other topic slugs, replace hyphens with spaces and otherwise preserve
   GitHub's lowercase spelling. Do not apply a broad title-casing algorithm.
8. Append the locally curated tags and deduplicate case-insensitively, preserving
   the live-first order.

Repository topics improve the live metadata, but they are not the only source
for technologies that are not represented by the primary language. Local tags
remain both the outage fallback and the curated source for intended secondary
badges such as SQLite or llama.cpp.

GitHub topic names only allow lowercase letters, numbers, and hyphens, which is
why the display aliases above are explicit rather than derived through title
casing.

### Initial topic rollout

At the time this specification was finalized, all four allowlisted repositories
returned an empty `topics` array. The following topics are recommended if the
repository metadata is later curated on GitHub, but they are not a release
prerequisite because the local tags preserve the intended badges:

| Repository | Initial GitHub topics |
| --- | --- |
| `ponchione/sodoryard` | `python`, `react`, `sqlite`, `lancedb`, `llama-cpp` |
| `ponchione/shunter` | None required; its primary language is sufficient |
| `ponchione/scrapeyard` | `sqlite` |
| `ponchione/agent-conductor` | `sqlite`, `llama-cpp` |

The implementation task does not modify GitHub repository settings. Missing
topics must not remove secondary technology badges after live hydration.

## Date display

- Change the label from `Last updated` to `Last pushed`.
- Render the value in a semantic `<time datetime="...">` element.
- Format valid timestamps in English as `Mon D, YYYY`, for example
  `Jul 30, 2026`.
- Use a fixed UTC date interpretation so a visitor's timezone cannot move the
  displayed calendar date backward or forward.
- Do not use relative text such as `2 days ago`; an absolute date is stable,
  compact, and unambiguous.

`pushed_at` describes repository push activity. The UI must say `Last pushed`,
not `Last worked on` or `Last commit`, to avoid claiming more precision than
GitHub provides.

## Client lifecycle and caching

The static fallback projects render immediately on both SSR output and initial
hydration. After mount:

1. Read a versioned cache entry from `sessionStorage`.
2. If it contains a valid response fetched within the last 15 minutes, merge
   it into the curated projects without making a request.
3. Otherwise request the GitHub repository list.
4. Validate the response at the boundary.
5. Store only the minimal repository fields and a `fetchedAt` timestamp.
6. Merge the live data into the existing cards without reordering them.

Suggested cache key:

```text
github-projects:v1
```

Use `sessionStorage`, not `localStorage`, so stale metadata does not persist
indefinitely across browsing sessions. Guard all storage access because storage
may be unavailable in private browsing or restricted environments. Storage
failure must simply fall through to the network request or local fallback.

A single hydrated Nuxt application instance must make no more than one GitHub
request, including when the visitor navigates away from `/projects` and back or
the composable is called more than once. Retain a module-level request promise
or attempt state after it settles; deduplicating only simultaneous callers is
not sufficient. A successful response is also written to `sessionStorage` for
reuse after a full page load. A failed request is not written as valid cache,
leaves local fallbacks in place for the current application instance, and may be
attempted again only after a full page load. Avoid adding a global state library.

## Failure and loading behavior

- Do not show a loading spinner, skeleton, error alert, or empty project list.
- Render fallback cards immediately so there is no empty-to-populated shift.
- Replace text in place after live data resolves.
- Allow the card to reflow naturally if the live description or tag count has a
  different height from its fallback; do not clamp content or reserve arbitrary
  empty space.
- On failure, keep every fallback card unchanged.
- Do not retry automatically in a loop.
- Do not expose rate-limit or network errors to visitors.
- Development-only logging is acceptable, but production should not emit noisy
  expected-error logs.
- One malformed GitHub repository object must not prevent valid objects from
  enriching their matching cards.

## Accessibility and interaction

- Preserve existing external-link behavior, accessible link text, and
  `rel="noopener noreferrer"`.
- Keep project name links and visible GitHub URL links keyboard accessible.
- Preserve existing reduced-motion behavior; live text replacement must not add
  animation.
- Do not move keyboard focus or announce the background refresh through a live
  region. The fallback content is already complete.
- Ensure technology badges remain text rather than icon-only content.
- Preserve the current mobile and desktop layouts.

## Security and privacy

- Never ship a GitHub personal access token to the browser.
- Treat every GitHub response as untrusted data.
- Render descriptions and topics through normal Vue text interpolation; do not
  use `v-html`.
- Validate that live repository links satisfy the repository-key and canonical
  URL rules above before replacing a local URL.
- Do not add analytics or forward visitor information beyond the direct GitHub
  API request implied by this feature.
- Keep the local fallback so browser extensions or privacy controls that block
  `api.github.com` do not break the page.

## Proposed implementation structure

Keep the change narrow. Expected files are:

- `app/data/projects.json`
  - rename `updated` to `last_pushed_at`;
  - replace fallback month labels with ISO 8601 GitHub timestamps.
- `app/types/index.ts`
  - update `PersonalProject`;
  - add minimal GitHub response and resolved-project types if they are shared.
- `app/utils/github-projects.ts` (new)
  - parse repository keys;
  - validate/minimize response objects;
  - normalize technology tags;
  - merge live metadata into curated projects;
  - format or expose dates for the component.
- `app/composables/useGithubProjects.ts` (new)
  - own browser-only fetching, timeout, session cache, and reactive state;
  - return resolved projects in local order.
- `app/pages/projects.vue`
  - replace the direct static array assignment with the composable result.
- `app/components/ProjectListing.vue`
  - render `last_pushed_at` as `Last pushed` in a `<time>` element.
- `tests/github-projects.test.ts` (new)
  - cover deterministic parsing, normalization, and merging.
- A focused component/composable test may be added if needed to verify fetch
  success and failure behavior without making real network requests.

Do not introduce a server endpoint, plugin, store, or third-party GitHub SDK.

## Test requirements

### Unit coverage

Cover at least these cases:

- Local project order is unchanged by GitHub response order.
- Repositories not allowlisted in `projects.json` never appear.
- Matching is case-insensitive and based on full repository name.
- A successful match replaces description, timestamp, and URL, and merges live
  language/topics with local tags.
- Local display name and lifecycle status survive every merge.
- Null GitHub description falls back locally.
- Null or invalid `pushed_at` falls back locally.
- Missing language and topics fall back to local tags.
- Language and topics are deduplicated case-insensitively.
- Incomplete GitHub topics do not remove curated secondary tags.
- Known topic slugs use their explicit display aliases.
- A missing configured repository affects only its own card.
- Malformed local URLs and malformed response entries do not throw.
- A live URL whose repository key disagrees with `full_name` does not replace
  the local link.
- A failed request leaves the original projects intact.
- Fresh cache data avoids a network request.
- Expired or malformed cache data is ignored.
- Repeated composable calls and client-side navigation make at most one request
  per hydrated application instance, including after a failed request.

All tests must mock GitHub responses; the test suite must never depend on the
real GitHub API.

### Manual verification

- Load `/projects` with JavaScript enabled and verify live metadata replaces
  fallback values without reordering cards.
- Confirm every expected secondary technology badge remains visible even when
  the live GitHub topic arrays are empty.
- Disable or block `api.github.com` and verify all fallback cards remain usable.
- Disable JavaScript and verify the static project list is complete.
- Verify a narrow mobile viewport and the desktop layout.
- Verify light and dark modes.
- Verify keyboard access and visible focus for both links on each card.
- Confirm no GitHub token or authorization header appears in browser requests
  or generated assets.
- Confirm `npm run generate` completes without needing network access to GitHub.

### Repository validation

Run all project checks after implementation:

```text
npm run typecheck
npm run lint
npm test
npm run generate
```

## Acceptance criteria

- `/projects` still renders exactly and only the entries in `projects.json`, in
  the same order as that file.
- Static fallback cards are present before JavaScript runs.
- A successful GitHub request refreshes description, last-push date, live
  technology metadata, and canonical repository URL without removing curated
  technology badges.
- Display names and lifecycle statuses always remain locally controlled.
- The card says `Last pushed` and renders an absolute date in a `<time>`
  element.
- Additional repositories in the GitHub response never appear automatically.
- GitHub failure, timeout, invalid data, rate limiting, unavailable browser
  storage, or a missing configured repository does not remove or break cards.
- At most one unauthenticated GitHub request is made per hydrated application
  instance; a fresh session cache avoids that request entirely.
- The GitHub request sends the pinned API-version header and no authorization
  header.
- Successful enrichment preserves the intended secondary technology badges
  even when GitHub topics are incomplete.
- No credentials, server runtime, new state layer, or GitHub SDK are added.
- Existing reduced-motion, responsive navigation, theme, route, and static
  generation behavior remain unchanged.
- All required validation commands pass.

## Future extensions

These are explicitly deferred:

- A cached Cloudflare Worker proxy if browser rate limits become observable.
- Pagination if the account grows beyond the first 100 public repositories.
- Event-driven or scheduled refreshes for build-time metadata.
- Private repository support.
- A separate factual `Archived` indicator.
- Release, commit-message, star, fork, issue, or activity-feed displays.

## References

- [GitHub REST repository endpoints](https://docs.github.com/en/rest/repos/repos)
- [GitHub REST API rate limits](https://docs.github.com/en/rest/using-the-rest-api/rate-limits-for-the-rest-api)
- [GitHub REST API CORS support](https://docs.github.com/en/rest/using-the-rest-api/using-cors-and-jsonp-to-make-cross-origin-requests)
- [GitHub REST API versions](https://docs.github.com/en/rest/about-the-rest-api/api-versions)
- [GitHub repository topic naming and management](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics)
