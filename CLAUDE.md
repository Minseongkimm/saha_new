# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Running the app
- `npm start` - Start Metro bundler
- `npm run android` - Build and run Android app
- `npm run ios` - Build and run iOS app (requires iOS setup)

### iOS Setup Requirements
For iOS development:
```bash
bundle install              # Install Ruby bundler (first time only)
bundle exec pod install     # Install CocoaPods dependencies
```
Run `bundle exec pod install` whenever native dependencies are updated.

### Code Quality
- `npm run lint` - Run ESLint
- `npm test` - Run Jest tests

## Architecture Overview

### Tech Stack
- React Native 0.80.2 with React 19.1.0
- TypeScript with strict configuration
- Supabase for backend (authentication and data)
- React Navigation v7 (Stack + Bottom Tabs)
- Vector Icons for UI elements

### Authentication Flow
- OAuth-based authentication using Supabase
- Deep linking support for OAuth callbacks (`saha://auth/callback`)
- Session management with AsyncStorage persistence
- App handles initial session detection and auth state changes

### Navigation Structure
**Root Stack Navigator** (`src/navigation/AppNavigator.tsx`):
- `Login` - Authentication screen (no header)
- `MainTabs` - Bottom tab navigator (main app flow)
- `BannerDetail`, `ExpertDetail`, `ChatRoom`, `SajuInfo`, `NotificationSettings`, `Charge` - Modal/detail screens

**Bottom Tab Navigator** (`src/navigation/BottomTabNavigator.tsx`):
- Home, Chat, and other main sections

### Key Directories
- `src/screens/` - Screen components
- `src/navigation/` - Navigation configuration
- `src/components/` - Reusable UI components  
- `src/utils/` - Utilities including Supabase client
- `src/constants/` - App constants (colors, fonts)
- `src/types/` - TypeScript type definitions
- `src/config/` - Configuration files

### Supabase Integration
- Client configured in `src/utils/supabaseClient.ts`
- Automatic session refresh and persistence enabled
- URL-based session detection for OAuth flows
- Debug mode enabled for development

### Styling Approach
- Custom color constants in `src/constants/colors.ts`
- Custom font configuration in `src/constants/fonts.ts`
- Component-level styling (no global CSS framework)

## Development Notes

### Platform-Specific Considerations
- Deep linking configured for OAuth flows
- Status bar styling differs between iOS/Android
- Android uses elevation 0 for headers, iOS uses shadowOpacity 0

### State Management
- Component-level state with React hooks
- Supabase handles authentication state globally
- Session state lifted to App.tsx and passed to AppNavigator

### Type Safety
- Strong TypeScript usage with navigation parameter types
- Navigation types defined in `src/types/navigation.ts`
- Supabase Session types from official SDK