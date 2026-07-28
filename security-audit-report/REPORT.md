# Security Audit Report

## Executive Summary
This report summarizes the findings of a security audit performed on the Epic Startup monorepo. The audit identified two confirmed instances of Stored Cross-Site Scripting (XSS) resulting from insecure server-side rendering of user-supplied HTML. These vulnerabilities allow attackers to execute arbitrary JavaScript in the context of victim users' sessions, posing a significant risk of account takeover and data compromise.

## Baseline Comparison
The application is a typical modern SaaS monorepo using Remix and React. Comparable software (e.g., Notion, Jira) implements robust, server-side content sanitization before rendering any user-generated HTML to prevent XSS. The Epic Startup attempts to sanitize data on the client-side but fails to do so on the server, leaving the initial server-side render vulnerable.

## Findings Summary

| Severity | Title | Description |
| :--- | :--- | :--- |
| High | Stored XSS via Note Content | The application renders untrusted note content without server-side sanitization. |
| Medium | Stored XSS via Note Comment Content | The application renders untrusted note comments without server-side sanitization. |

## Detailed Findings

See `FINDINGS-DETAIL.md` for full traces and execution instructions.

## Hardening Notes
*   **Enforce Server-Side Sanitization:** All user-generated HTML must be sanitized on the server before being sent to the client. Relying solely on client-side sanitization (like `DOMPurify` during React hydration) is insufficient for Server-Side Rendered (SSR) applications.
*   **Content Security Policy (CSP):** Implement a strict CSP to mitigate the impact of any XSS vulnerabilities that might bypass sanitization.

## Positive Patterns
*   The application utilizes a structured permission model (`requireUserWithOrganizationPermission`).
*   Database queries generally use Prisma, mitigating direct SQL injection risks.
*   The project provides clear security guidelines in `apps/docs/security/secure-coding.mdx`.
