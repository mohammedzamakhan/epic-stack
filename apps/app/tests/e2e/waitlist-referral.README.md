# Waitlist Referral System E2E Tests

This test suite verifies the complete functionality of the waitlist referral ranking system.

## Running the Tests

The waitlist referral tests require `LAUNCH_STATUS=CLOSED_BETA` to be set, as the waitlist is only active in closed beta mode.

### Run all waitlist referral tests:

```bash
LAUNCH_STATUS=CLOSED_BETA npx playwright test waitlist-referral
```

### Run a specific test:

```bash
LAUNCH_STATUS=CLOSED_BETA npx playwright test waitlist-referral -g "user gets waitlist entry"
```

### Run with UI mode (for debugging):

```bash
LAUNCH_STATUS=CLOSED_BETA npx playwright test waitlist-referral --ui
```

### Run in headed mode (see browser):

```bash
LAUNCH_STATUS=CLOSED_BETA npx playwright test waitlist-referral --headed
```

## Test Coverage

The test suite covers:

1. **Basic Waitlist Entry**
   - User signup creates waitlist entry
   - Default 1 point is awarded
   - Rank is calculated and displayed

2. **Referral Link Generation**
   - Referral code format: `username-XXXX` (4 digits)
   - Referral URL is displayed with copy button
   - Referral instructions are visible

3. **Complete Referral Flow**
   - Referee clicks referral link → redirected to signup
   - Referral code stored in session
   - After signup, referee is linked to referrer
   - Referrer receives +5 points
   - Referee starts with 1 point

4. **Rank Calculation**
   - Higher points = better rank
   - Same points: earlier signup = better rank
   - Total user count is accurate

5. **Discord Points**
   - +2 points for joining Discord
   - Can only be claimed once
   - Status is displayed on UI

6. **Edge Cases & Validation**
   - Prevents self-referral
   - Prevents duplicate referrals
   - Invalid referral codes show error
   - Referral count is displayed correctly

## Environment Variables

The tests automatically set `LAUNCH_STATUS=CLOSED_BETA` at the module level, but it's recommended to set it explicitly when running:

```bash
# In apps/app directory
LAUNCH_STATUS=CLOSED_BETA npm run test:e2e:run -- waitlist-referral
```

## Database State

These tests:
- Create temporary users and waitlist entries
- Clean up after themselves using Playwright fixtures
- Can be run in parallel with other tests (when properly isolated)

## Debugging Tips

1. **Visual debugging**: Use `--ui` flag to step through tests visually
2. **Headed mode**: Use `--headed` to see the browser actions
3. **Trace viewer**: Failed tests automatically generate traces in `playwright-report/`
4. **Console logs**: Check test output for database verification results

## Common Issues

### Issue: Tests redirect to `/organizations/create` instead of `/waitlist`

**Solution**: Ensure `LAUNCH_STATUS=CLOSED_BETA` is set when running tests

### Issue: "Email not found" error

**Solution**: Check that email mocking is properly configured in `tests/mocks/`

### Issue: Rank calculation failures

**Solution**: Tests may interfere with each other. Run specific test in isolation:
```bash
LAUNCH_STATUS=CLOSED_BETA npx playwright test -g "rank calculation" --workers=1
```
