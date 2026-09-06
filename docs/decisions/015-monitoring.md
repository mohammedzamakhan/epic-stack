# Monitoring

Date: 2023-06-09

Status: amended 2026-09-05

## Context

Production incidents should be discoverable without watching dashboards around
the clock. The product also needs privacy-aware website and product analytics,
browser performance signals, structured logs, and readable production errors.
The App and marketing site run on Cloudflare Workers, which can export runtime
logs through a native OpenTelemetry destination.

## Decision

Use PostHog for website analytics, App product analytics, browser/server error
tracking, and log exploration. Scope the browser/server SDKs to `apps/app` and
`apps/web`. Keep analytics optional: an empty project token disables it.

The authenticated App requires explicit analytics consent before capture or
identity. Marketing uses cookieless analytics and runs the SDK loader through
Partytown. Cloudflare exports Worker logs directly instead of coupling shared
packages to a telemetry vendor.

## Consequences

One product now correlates analytics, errors, and logs. Partytown protects the
marketing critical path, while the App keeps its SDK on the main thread for
React integration and consent control. Cloudflare destination setup and
source-map credentials remain external deployment prerequisites. Telemetry must
continue to exclude secrets and customer PII.
