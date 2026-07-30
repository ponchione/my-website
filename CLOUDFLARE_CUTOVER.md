# Cloudflare Pages Cutover

This runbook separates the account-bound dashboard work from the automated
validation gates. Do not change DNS until Stage 2 passes.

## Stage 1 — Create the Git-integrated Pages project

This stage must be completed by a user who can authorize both Cloudflare and
GitHub:

1. In Cloudflare, open **Workers & Pages**, select **Create application**, open
   the **Pages** tab, and select **Import an existing Git repository**.
2. Authorize the Cloudflare GitHub application for
   `ponchione/my-website`, then select that repository.
3. Use these build settings:

   | Setting | Value |
   | --- | --- |
   | Production branch | `main` |
   | Build command | `npm run generate` |
   | Build output directory | `.output/public` |
   | Root directory | Repository root / blank |
   | Environment variable | `NODE_VERSION=24.11.0` |

4. Save and deploy the project.
5. Record the resulting `https://<project>.pages.dev` URL and provide it for
   Stage 2 validation.

Do not use `wrangler pages project create` for the initial project. Wrangler
creates a Direct Upload project, and Cloudflare does not allow an existing
Direct Upload project to be converted to Git integration later.

## Stage 2 — Validate before DNS

No DNS record changes are permitted until the Pages URL passes:

```sh
PREVIEW_URL=https://<project>.pages.dev npm run verify:preview
```

The verifier covers all public routes and exact post slugs, client navigation,
titles, canonical metadata, useful generated content, 404 status and content,
theme hydration, mobile-sheet focus behavior, keyboard work-history expansion,
reduced motion, and the full 34-image parity matrix.

Also inspect the Pages build log and confirm that the deployment is built from
commit `0fa5d722e6aa01b0334d5bc5fc066d9841741f40` or a later validated commit.

## Stage 3 — Custom domain and DNS

Only begin this stage after Stage 2 is recorded as passing in `NUXT_PORT.md`.

### `www` cutover

1. In the Pages project, open **Custom domains**, choose **Set up a domain**,
   and add `www.mitchellponchione.com` before changing its DNS record.
2. Cloudflare will show the exact `*.pages.dev` target. At GoDaddy, replace the
   current `www` CNAME target
   `037ce92a12b675d1.vercel-dns-017.com` with that target.
3. Wait for the Pages custom-domain and TLS statuses to become active.
4. Re-run the Stage 2 verifier with
   `PREVIEW_URL=https://www.mitchellponchione.com` and independently confirm
   HTTPS, `robots.txt`, `sitemap.xml`, all deep links, and the 404 response.

Cloudflare requires the Pages custom domain to be associated in the dashboard
before the external CNAME is changed; creating only the CNAME can produce a
`522` response.

### Apex behavior

The authoritative nameservers are currently GoDaddy:

- `ns55.domaincontrol.com`
- `ns56.domaincontrol.com`

Cloudflare Pages requires an apex custom domain to be a zone on the same
Cloudflare account with nameservers delegated to Cloudflare. For a complete
cutover:

1. Add `mitchellponchione.com` as a Cloudflare zone.
2. Export or otherwise inventory every GoDaddy DNS record and compare it with
   Cloudflare's imported records before delegation. Preserve non-site records,
   including the existing `_dmarc` TXT record.
3. Change the registrar nameservers to the pair assigned by Cloudflare and wait
   until the zone is active.
4. Add `mitchellponchione.com` to the Pages project's custom domains.
5. Add a permanent redirect for the exact apex hostname to
   `https://www.mitchellponchione.com`, preserving the request path and query.
6. Confirm that the apex redirects once, `www` returns the Cloudflare Pages
   deployment over HTTPS, and canonical links still use `www`.

Keep the Vercel project and its historical deployments intact throughout this
process. Removing that project is explicitly outside this migration.

## Rollback references

- Previous `www` CNAME target:
  `037ce92a12b675d1.vercel-dns-017.com`
- Previous GoDaddy nameservers: `ns55.domaincontrol.com` and
  `ns56.domaincontrol.com`
- Validated migration commit:
  `0fa5d722e6aa01b0334d5bc5fc066d9841741f40`

Do not perform a nameserver rollback without confirming that the original
GoDaddy zone still contains the complete record set.

## Official references

- [Cloudflare Pages Git integration](https://developers.cloudflare.com/pages/configuration/git-integration/)
- [Cloudflare Pages Direct Upload](https://developers.cloudflare.com/pages/get-started/direct-upload/)
- [Cloudflare Pages custom domains](https://developers.cloudflare.com/pages/configuration/custom-domains/)
- [Nuxt static hosting](https://nuxt.com/docs/4.x/getting-started/deployment#static-hosting)
