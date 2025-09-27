# Epic Stack Mobile App

A React Native mobile application built with Expo that provides authentication
functionality integrated with the Epic Stack backend.

## Features

- React Native with Expo SDK 54+
- Expo Router for file-based navigation
- TypeScript configuration
- Landing pages for new users
- Authentication screens (Sign In / Sign Up)
- Integration with existing backend APIs
- Monorepo integration with Turbo

## Project Structure

```
apps/mobile/
├── app/                    # Expo Router screens
│   ├── (auth)/            # Authentication screens
│   │   ├── landing.tsx    # Main landing page
│   │   ├── welcome.tsx    # Alternative welcome page
│   │   ├── sign-in.tsx    # Sign in screen
│   │   ├── sign-up.tsx    # Sign up screen
│   │   └── _layout.tsx    # Auth layout
│   ├── _layout.tsx        # Root layout
│   └── index.tsx          # Home screen
├── components/            # Reusable components
├── lib/                   # Utilities and services
├── hooks/                 # Custom React hooks
├── types/                 # TypeScript definitions
├── constants/             # App constants
├── assets/               # Images and static assets
└── package.json          # Dependencies and scripts
```

## Development

### Prerequisites

- Node.js 22+
- npm 10+
- Expo CLI
- iOS Simulator (for iOS development)
- Android Studio (for Android development)

### Getting Started

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the development server:

   ```bash
   npm run dev
   ```

3. Run on specific platforms:
   ```bash
   npm run ios      # iOS Simulator
   npm run android  # Android Emulator
   npm run web      # Web browser
   ```

### From Monorepo Root

You can also run the mobile app from the monorepo root:

```bash
npm run dev:mobile          # Start mobile app
turbo run typecheck --filter mobile  # Type check
turbo run lint --filter mobile       # Lint code
```

## Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```bash
# API Configuration
EXPO_PUBLIC_API_URL=http://localhost:3000

# OAuth Configuration
EXPO_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
EXPO_PUBLIC_GITHUB_CLIENT_ID=your_github_client_id

# App Configuration
EXPO_PUBLIC_APP_ENV=development
```

### App Configuration

The app is configured in `app.json` with:

- App name and bundle identifiers
- Expo Router plugin
- Platform-specific settings
- Deep linking scheme

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run typecheck` - Run TypeScript checks
- `npm run lint` - Run ESLint
- `npm run test` - Run Jest tests

## Integration with Backend

The mobile app integrates with the existing Epic Stack backend:

- Uses same authentication endpoints
- Shares validation schemas
- Follows same error handling patterns
- Maintains session consistency

## Package Compatibility

The project uses Expo SDK 54 compatible package versions:

- `expo-router@~6.0.0` (updated from 4.0.x for compatibility)
- `expo-secure-store@~15.0.6` (updated from 14.0.x)
- `expo-auth-session@~7.0.7` (updated from 6.0.x)
- `expo-crypto@~15.0.6` (updated from 14.0.x)
- `expo-linking@~8.0.7` (updated from 7.0.x)
- `expo-constants@~18.0.8` (updated from 17.0.x)
- `react-native-safe-area-context@~5.6.0` (updated from 4.14.0)
- `react-native-screens@~4.16.0` (updated from 4.4.0)
- `jest-expo@~54.0.10` (updated from 52.0.x)

These versions ensure compatibility with Expo SDK 54 and prevent version
mismatch warnings.

## Next Steps

This is the basic project structure. The next tasks will implement:

1. Shared validation and type packages
2. Authentication API client
3. Secure storage management
4. Authentication context and state management
5. UI components and screens
6. OAuth integration
7. Comprehensive testing
