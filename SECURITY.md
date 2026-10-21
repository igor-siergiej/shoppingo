# Security Policy

## Supported versions

Only the latest commit on the `main` branch receives security fixes. Older
releases and tags are not patched — please upgrade rather than ask for a
backport. The published Docker images (`igor-siergiej/shoppingo-web:latest`
and `:api`) always track `main`.

| Branch  | Supported |
| ------- | --------- |
| `main`  | ✅        |
| older   | ❌        |

## Reporting a vulnerability

**Please use [GitHub private vulnerability
reporting](https://github.com/igor-siergiej/shoppingo/security/advisories/new)
on this repository.** It's enabled for this repo and goes straight to the
maintainer. The report is visible only to the maintainer until they choose to
publish it; no public issue, no disclosure timeline.

Use private reporting for **anything** that could be a security issue — even
if you're not sure. Common examples in this codebase: auth/session/token
handling (`packages/api/src/infrastructure/AuthClient`,
`packages/web/src/auth`, `packages/api/src/middleware`), image upload and
proxying (`infrastructure/ObjectStore*`, `infrastructure/MediaWikiCookbookSource`),
webhook handlers (`routes/index.ts`), MongoDB queries and S3 object-store access
patterns, the Better Auth configuration (`packages/api/src/infrastructure/BetterAuth`,
mounted at `/api/auth/*`), and the PWA service worker.

**Do not** open a public GitHub issue, discussion, PR or Bluesky DM for
security reports. Anything in a public channel risks disclosure before a fix
is available.

## What to include

A high-quality report should describe:

1. **The bug** — what it is and what an attacker can do.
2. **The surface** — endpoint, component, file (or a guess), version/commit.
3. **Reproduction** — minimal steps, request payload, account state needed.
4. **Impact** — confidentiality / integrity / availability, and the realistic
   worst case (data leak, account takeover, RCE, etc.).
5. **Mitigations you've tried** — optional but appreciated.

## Triage and disclosure

- **Acknowledgement** within 2 working days, an initial assessment within 5.
- **Fix** before public disclosure whenever possible. The maintainer may
  coordinate an embargoed disclosure with reporters and downstream
  deployments (self-host users typically get a few extra days because pulling
  `:latest` is manual).
- **CVE** is requested via GitHub Security Advisories when the report
  warrants one.
- **Hall of fame** — reporters who consent are credited in the advisory after
  the fix ships.

If you'd like to encrypt a longer report, reach out via the private
vulnerability form first and a key exchange can happen there.

## Scope and out-of-scope

In scope: this repository and the published Docker images.

Out of scope: the
self-hosted / hosted third-party dependencies (MongoDB, the RustFS object store, the reverse
proxy, the cloud), and social-engineering attacks. Rate-limiting bugs on the
demo instance of shoppingo are also out of scope unless they affect the
default configuration.
