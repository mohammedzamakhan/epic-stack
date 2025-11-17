# Code Duplication Analysis

This document summarizes the duplicate code found by `npx jscpd apps` and provides a refactoring plan.

## Summary Statistics

- **Total duplicate code found**: Extensive duplications across multiple areas
- **Largest impact**: API routes duplicated between `apps/admin` and `apps/app`
- **Estimated duplicate lines**: ~1000+ lines across all categories

## Major Duplication Categories

### 1. API Routes (admin/app duplication) - HIGH PRIORITY

#### Stripe Payment Routes (206 lines)
**Files:**
- `apps/admin/app/routes/api+/stripe+/webhook.tsx` (121 lines)
- `apps/app/app/routes/api+/stripe+/webhook.tsx` (121 lines) - **100% identical**
- `apps/admin/app/routes/api+/stripe+/checkout.tsx` (85 lines)
- `apps/app/app/routes/api+/stripe+/checkout.tsx` (85 lines) - **100% identical**

**Solution:** Move to `packages/payments/src/route-handlers/`

#### Integration Routes (406 lines)
**Files:**
- OAuth Callback: `apps/admin/app/routes/api+/integrations+/oauth.callback.tsx` (144 lines) - **100% identical**
- Update Config: `apps/admin/app/routes/api+/integrations+/update-config.ts` (101 lines) - **100% identical**
- Jira Search Users: `apps/admin/app/routes/api+/integrations+/jira+/$integrationId+/search-users.ts` (61 lines) - **100% identical**
- Jira Current User: `apps/admin/app/routes/api+/integrations+/jira+/$integrationId+/current-user.ts` (53 lines) - **100% identical**

**Solution:** Move to `packages/integrations/src/route-handlers/`

#### Onboarding Routes (85 lines)
**Files:**
- Progress: `apps/admin/app/routes/api+/onboarding+/progress.tsx` (30 lines) - **100% identical**
- Hide: `apps/admin/app/routes/api+/onboarding+/hide.tsx` (27 lines) - **100% identical**
- Complete Step: `apps/admin/app/routes/api+/onboarding+/complete-step.tsx` (28 lines) - **100% identical**

**Solution:** Move to `packages/common/src/onboarding/route-handlers/`

#### AI Routes (74 lines)
**Files:**
- Generate Content: `apps/admin/app/routes/api+/ai+/generate-content.tsx` (19 lines) - **100% identical**
- Chat: `apps/admin/app/routes/api+/ai+/chat.tsx` (55 lines) - **100% identical**

**Solution:** Move to `packages/ai/src/route-handlers/`

**Total API Routes Duplication: ~771 lines**

### 2. Settings Pages - MEDIUM PRIORITY

#### Internal Duplications within app
**Locations:**
- `apps/app/app/routes/_app+/$orgSlug_+/settings+/members.tsx`
- `apps/app/app/routes/_app+/$orgSlug_+/settings+/integrations.tsx`
- `apps/app/app/routes/_app+/$orgSlug_+/settings+/billing.tsx`
- `apps/app/app/routes/_app+/$orgSlug_+/settings+/_index.tsx`

**Patterns:**
- Similar loader patterns (19-24 lines duplicated)
- Similar action handlers
- Common form structures (13-34 lines)

**Solution:** Create shared utilities in `packages/ui/src/settings/` for:
- `createSettingsLoader()` utility
- `createSettingsAction()` utility
- Shared form components

### 3. CMS Form Blocks - MEDIUM PRIORITY

#### Form Component Duplications
**Files:**
- `apps/cms/src/blocks/Form/Text/index.tsx`
- `apps/cms/src/blocks/Form/Email/index.tsx`
- `apps/cms/src/blocks/Form/Number/index.tsx`
- `apps/cms/src/blocks/Form/Textarea/index.tsx`
- `apps/cms/src/blocks/Form/Select/index.tsx`
- `apps/cms/src/blocks/Form/Country/index.tsx`
- `apps/cms/src/blocks/Form/State/index.tsx`

**Patterns:**
- Similar input field wrappers (12-20 lines)
- Common validation logic
- Shared label/error handling

**Solution:** Create base form field component in `apps/cms/src/blocks/Form/BaseField/`

### 4. CMS Seed Data - LOW PRIORITY

#### Seed File Duplications
**Files:**
- `apps/cms/src/endpoints/seed/post-1.ts`
- `apps/cms/src/endpoints/seed/post-2.ts`
- `apps/cms/src/endpoints/seed/post-3.ts`
- `apps/cms/src/endpoints/seed/image-1.ts`
- `apps/cms/src/endpoints/seed/image-2.ts`
- `apps/cms/src/endpoints/seed/image-3.ts`
- `apps/cms/src/endpoints/seed/home.ts`

**Patterns:**
- Similar data structure patterns (17-64 lines)
- Repeated block structures

**Solution:** Create seed data factory functions

### 5. Admin Role Management - MEDIUM PRIORITY

#### Role Pages Duplications
**Files:**
- `apps/admin/app/routes/_admin+/roles+/$roleId.tsx`
- `apps/admin/app/routes/_admin+/roles+/system.$roleId.tsx`

**Patterns:**
- Similar form structures (13-38 lines)
- Duplicate permission handling (14-28 lines)

**Solution:** Extract shared role management components

### 6. Mobile Test Setup - LOW PRIORITY

#### Test File Duplications
**Files:**
- Various test files in `apps/mobile/lib/auth/hooks/__tests__/`
- Various test files in `apps/mobile/lib/api/__tests__/`

**Patterns:**
- Similar test setup code (9-13 lines)
- Common mock configurations

**Solution:** Create shared test utilities in `apps/mobile/lib/__tests__/utils/`

### 7. Auth Routes - MEDIUM PRIORITY

#### Auth Flow Duplications
**Files:**
- `apps/app/app/routes/api+/auth.login.ts`
- `apps/app/app/routes/api+/auth.signup.ts`
- `apps/app/app/routes/api+/auth.onboarding.ts`
- `apps/app/app/routes/api+/auth.$provider.callback.ts`
- `apps/app/app/routes/api+/auth.verify.ts`
- `apps/app/app/routes/api+/auth.refresh.ts`

**Patterns:**
- Similar session creation logic (10-22 lines)
- Common error handling (17-19 lines)
- Shared cookie management (14-17 lines)

**Solution:** Move to `packages/auth/src/route-handlers/`

## Refactoring Plan

### Phase 1: API Routes (Highest ROI)
1. ✅ Create route-handlers in existing packages
2. ✅ Extract Stripe handlers to `packages/payments`
3. ✅ Extract integration handlers to `packages/integrations`
4. ✅ Extract onboarding handlers to `packages/common`
5. ✅ Extract AI handlers to `packages/ai`
6. ✅ Update both admin and app to use shared handlers

### Phase 2: Settings & Components
1. ✅ Create shared settings utilities
2. ✅ Refactor CMS form blocks
3. ✅ Extract role management components

### Phase 3: Test Utilities & Polish
1. ✅ Create mobile test utilities
2. ✅ Extract auth route handlers
3. ✅ Refactor seed data factories (optional)

## Expected Benefits

- **Reduced code duplication**: ~1000+ lines
- **Improved maintainability**: Changes only need to be made once
- **Better type safety**: Shared types across apps
- **Easier testing**: Test handlers once, use everywhere
- **Faster development**: Reusable patterns for new features

## Implementation Notes

- All route handlers will maintain the same API
- Existing routes will become thin wrappers that import and re-export
- No breaking changes to existing functionality
- Each package will expose route handlers via dedicated exports
