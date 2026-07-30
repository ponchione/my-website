# Cloudflare Workers Cutover

This runbook records the completed Workers Static Assets deployment and
custom-domain cutover. The preview gate passed before DNS changed, and the
production hostname and apex redirect were independently verified afterward.

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
| Build command | `npm run build` |
| Deploy command | `npm run deploy` |
| Root directory | Repository root / blank |
| Node version | `24.11.0` via `.nvmrc` and `package.json` |

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

This stage passed on 2026-07-30 before the custom-domain cutover proceeded.

## Stage 3 — Cloudflare DNS and custom domain

The zone is active on Cloudflare with authoritative nameservers
`jocelyn.ns.cloudflare.com` and `owen.ns.cloudflare.com`. The registrar exposed
no DS record during cutover, and non-site DNS records, including `_dmarc`, were
preserved.

`www.mitchellponchione.com` is attached by the `custom_domain` route in
`wrangler.jsonc`; Cloudflare manages its DNS integration and TLS certificate.
The strengthened verifier passed against the production hostname on 2026-07-30:

```sh
PREVIEW_URL=https://www.mitchellponchione.com npm run verify:preview
```

The canonical hostname is `www`. The apex now has a proxied `A` placeholder of
`192.0.2.0` and an active Cloudflare **Redirect from root to WWW** rule:

- Request URL: `https://mitchellponchione.com/*`
- Target URL: `https://www.mitchellponchione.com/${1}`
- Status: `301`
- Preserve query string: enabled

Final checks confirmed that HTTP upgrades to HTTPS, the apex HTTPS redirect
preserves paths and query strings, valid deep links return 200, unknown paths
return the custom page with status 404, and production responses no longer
contain Vercel headers.

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
