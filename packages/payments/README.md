# @repo/payments

Centralized payment provider package for handling subscriptions, checkouts, and billing across multiple payment providers.

## Features

- 🔌 **Provider Abstraction**: Easy switching between payment providers (Stripe, Polar, Lemon Squeezy)
- 🛡️ **Type-Safe**: Full TypeScript support with comprehensive type definitions
- 🔄 **Consistent API**: Same interface regardless of payment provider
- 🧪 **Test Helpers**: Built-in test helpers for development
- 📦 **Modular**: Import only what you need

## Installation

This package is part of the monorepo and is already available as `@repo/payments`.

Add it to your app's package.json:

```json
{
  "dependencies": {
    "@repo/payments": "*"
  }
}
```

## Usage

### Basic Setup

```typescript
import { createPaymentProvider } from '@repo/payments'

// Create provider instance
const paymentProvider = createPaymentProvider({
  provider: 'stripe',
  apiKey: process.env.STRIPE_SECRET_KEY!,
  webhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
})
```

### Get Products and Prices

```typescript
// Get all products
const products = await paymentProvider.getProducts()

// Get all prices
const prices = await paymentProvider.getPrices()

// Get organized plans and prices
const plansAndPrices = await paymentProvider.getPlansAndPrices()
```

### Create Checkout Session

```typescript
const session = await paymentProvider.createCheckoutSession({
  priceId: 'price_xxx',
  quantity: 1,
  successUrl: 'https://example.com/success',
  cancelUrl: 'https://example.com/cancel',
  customerId: 'cus_xxx', // optional
  trialPeriodDays: 14, // optional
  allowPromotionCodes: true,
})

// Redirect user to checkout
redirect(session.url)
```

### Manage Subscriptions

```typescript
// Retrieve subscription
const subscription = await paymentProvider.retrieveSubscription('sub_xxx')

// Update subscription (upgrade/downgrade)
const updated = await paymentProvider.updateSubscription({
  subscriptionId: 'sub_xxx',
  priceId: 'price_yyy',
  quantity: 5,
  preserveTrialEnd: true,
})

// Cancel subscription
await paymentProvider.cancelSubscription('sub_xxx')

// List customer subscriptions
const subscriptions = await paymentProvider.listSubscriptions('cus_xxx')
```

### Customer Portal

```typescript
const portalSession = await paymentProvider.createCustomerPortalSession({
  customerId: 'cus_xxx',
  returnUrl: 'https://example.com/settings',
  productId: 'prod_xxx', // optional, needed for configuration
})

redirect(portalSession.url)
```

### Invoices

```typescript
const invoices = await paymentProvider.listInvoices('cus_xxx', 20)
```

### Webhook Handling

```typescript
const event = await paymentProvider.constructWebhookEvent(
  payload,
  signature,
  webhookSecret,
)

switch (event.type) {
  case 'customer.subscription.created':
    // Handle subscription created
    break
  case 'customer.subscription.updated':
    // Handle subscription updated
    break
  // ... other events
}
```

### Trial Configuration

```typescript
import { getTrialConfig, calculateManualTrialDaysRemaining } from '@repo/payments'

// Get trial configuration from environment
const config = getTrialConfig()
// { trialDays: 14, creditCardRequired: 'manual' }

// Calculate days remaining for manual trials
const daysRemaining = calculateManualTrialDaysRemaining(
  organization.createdAt
)
```

## Environment Variables

```env
# Required
STRIPE_SECRET_KEY=sk_test_xxx

# Optional
TRIAL_DAYS=14
CREDIT_CARD_REQUIRED_FOR_TRIAL=manual # or 'stripe'
STRIPE_WEBHOOK_SECRET=whsec_xxx
```

## Switching Payment Providers

To switch from Stripe to another provider, simply change the configuration:

```typescript
// Before: Stripe
const provider = createPaymentProvider({
  provider: 'stripe',
  apiKey: process.env.STRIPE_SECRET_KEY!,
})

// After: Polar (when available)
const provider = createPaymentProvider({
  provider: 'polar',
  apiKey: process.env.POLAR_SECRET_KEY!,
})

// After: Lemon Squeezy (when available)
const provider = createPaymentProvider({
  provider: 'lemon-squeezy',
  apiKey: process.env.LEMON_SQUEEZY_API_KEY!,
})
```

The rest of your code remains unchanged! 🎉

## Advanced Usage

### Direct Stripe Client Access

If you need Stripe-specific functionality, you can access the underlying client:

```typescript
import { StripeProvider } from '@repo/payments'

const provider = new StripeProvider({
  apiKey: process.env.STRIPE_SECRET_KEY!,
})

// Access Stripe client for advanced features
const stripeClient = provider.getClient()
const charge = await stripeClient.charges.retrieve('ch_xxx')
```

### Type Safety

All types are exported for your convenience:

```typescript
import type {
  PaymentProvider,
  Product,
  Price,
  Subscription,
  CheckoutSession,
  Invoice,
} from '@repo/payments'
```

## Testing

The package includes test helpers for development:

```typescript
// Create test clock (Stripe)
const testClock = await provider.createTestClock?.()

// Create test customer
const customer = await provider.createTestCustomer?.(testClock.id)
```

## Architecture

```
@repo/payments/
├── src/
│   ├── types.ts              # Core interfaces and types
│   ├── factory.ts            # Provider factory
│   ├── trial-config.ts       # Trial configuration utilities
│   └── providers/
│       ├── stripe.ts         # Stripe implementation
│       ├── polar.ts          # Polar implementation (coming soon)
│       └── lemon-squeezy.ts  # Lemon Squeezy implementation (coming soon)
└── index.ts                  # Public API
```

## Contributing

To add a new payment provider:

1. Create a new file in `src/providers/` (e.g., `polar.ts`)
2. Implement the `PaymentProvider` interface
3. Add the provider to the factory in `src/factory.ts`
4. Update this README with provider-specific notes

## License

MIT
