# Cloudflare Workers Cutover

This runbook records the validated Workers Static Assets deployment and the
remaining account-bound domain work. The custom domain must not be changed
until the preview gate below passes after every hosting-configuration change.

## Stage 1 — Workers deployment

The site is deployed at:

`https://my-website.mitchell-ponchione.workers.dev`

The repository now owns the deployment behavior in `wrangler.jsonc`:

- Worker name: `my-website`
- Static assets: `.output/public`
- HTML handling: `drop-trailing-slash`
- Not-found handling: `404-page`

Cloudflare automatically deployed commit `5f8c456` after it was pushed to
`main`. The resulting change from redirecting `/projects` to serving it directly
proves that the Worker is connected to the repository and production branch.

The Cloudflare build must retain:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Build command | `npm run generate` |
| Deploy command | `npm run deploy` |
| Root directory | Repository root / blank |
| Environment variable | `NODE_VERSION=24.11.0` |

## Stage 2 — Preview acceptance

The strengthened remote verifier passes against the Workers URL:

```sh
PREVIEW_URL=https://my-website.mitchell-ponchione.workers.dev npm run verify:preview
```

Validated behavior includes:

- Every public route and exact post slug returns 200 without redirecting to a
  different trailing-slash shape.
- Unknown navigation requests return the generated error page with status 404.
- Titles, canonical metadata, generated content, `robots.txt`, and
  `sitemap.xml` are correct.
- Direct loading, client navigation, theme hydration, mobile-sheet focus,
  keyboard work-history expansion, and reduced motion pass.
- All 34 desktop/mobile and light/dark parity captures match the baseline page
  dimensions.

This stage passed on 2026-07-30. The custom-domain cutover may proceed.

## Stage 3 — Cloudflare DNS and custom domain

Workers Custom Domains require an active Cloudflare zone. Do not point an
external CNAME directly at the `workers.dev` hostname.

### Onboard the zone

1. In Cloudflare, select **Domains → Onboard a domain** and add
   `mitchellponchione.com`.
2. Let Cloudflare scan the existing zone, then compare every imported record
   against GoDaddy before changing nameservers. Preserve non-site records,
   including the existing `_dmarc` TXT record.
3. Confirm the registrar has no active DNSSEC/DS record. A public lookup showed
   no DS record before this cutover, but the registrar remains authoritative.
4. At GoDaddy, replace the current nameservers with the exact pair assigned by
   Cloudflare.
5. Wait until Cloudflare reports the zone as **Active**.

The previous authoritative nameservers are:

- `ns55.domaincontrol.com`
- `ns56.domaincontrol.com`

The imported site records should continue pointing at Vercel during zone
activation, keeping the rollback deployment live.

### Attach `www` to the Worker

1. In Cloudflare DNS, remove the imported `www` CNAME that currently targets
   `037ce92a12b675d1.vercel-dns-017.com`.
2. Open **Workers & Pages → my-website → Settings → Domains & Routes**.
3. Select **Add → Custom Domain**, enter `www.mitchellponchione.com`, and confirm.
   Cloudflare creates the proxied DNS record and certificate.
4. Wait until the custom domain and TLS certificate are active.
5. Run:

   ```sh
   PREVIEW_URL=https://www.mitchellponchione.com npm run verify:preview
   ```

6. Independently confirm HTTPS, `robots.txt`, `sitemap.xml`, every deep link,
   and the 404 response before changing apex behavior.

### Redirect the apex to `www`

The canonical hostname is `www`, so the apex should redirect rather than serve
a duplicate site:

1. Replace the imported apex Vercel record with a proxied `A` record whose
   value is the reserved placeholder `192.0.2.0`.
2. Create a Cloudflare **Single Redirect** using:
   - Request URL: `https://mitchellponchione.com/*`
   - Target URL: `https://www.mitchellponchione.com/${1}`
   - Status: `301`
   - Preserve query string: enabled
3. Confirm the apex redirects exactly once while preserving paths and query
   strings, and that the destination canonical link uses `www`.

## Final verification and rollback

Keep the Vercel project and its historical deployments intact. Removing that
project is explicitly outside this migration.

Rollback references:

- Previous `www` CNAME:
  `037ce92a12b675d1.vercel-dns-017.com`
- Previous GoDaddy nameservers: `ns55.domaincontrol.com` and
  `ns56.domaincontrol.com`
- Last fully validated pre-domain Worker URL:
  `https://my-website.mitchell-ponchione.workers.dev`

Do not roll nameservers back without confirming that the original GoDaddy zone
still contains the complete record set.

## Official references

- [Cloudflare Workers Static Assets](https://developers.cloudflare.com/workers/static-assets/)
- [Static-site and custom-404 routing](https://developers.cloudflare.com/workers/static-assets/routing/static-site-generation/)
- [Workers Custom Domains](https://developers.cloudflare.com/workers/configuration/routing/custom-domains/)
- [Cloudflare full-zone setup](https://developers.cloudflare.com/dns/zone-setups/full-setup/setup/)
- [Cloudflare Single Redirects](https://developers.cloudflare.com/rules/url-forwarding/single-redirects/settings/)
- [Nuxt static hosting](https://nuxt.com/docs/4.x/getting-started/deployment#static-hosting)
