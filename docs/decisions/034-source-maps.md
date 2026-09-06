# Source Maps

Date: 2023-11-03

Status: amended 2026-09-05

## Context

Read [016-source-maps](016-source-maps.md) for the original context. Production
error tracking needs source maps, but browsers do not need to download them.

## Decision

Generate client source maps for production App and Web builds only when PostHog
source-map upload credentials are present. Upload them during the build and
delete the local maps after a successful upload. Cloudflare server bundles do
not produce public source maps.

## Consequences

PostHog errors have readable stack traces without publishing maps beside browser
assets. Builds without monitoring credentials still work, but their production
errors remain minified.
