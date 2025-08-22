# Orderia - Restaurant Management System

Orderia is a React Native mobile restaurant management application built with Expo, TypeScript, and Zustand state management. This app enables restaurant staff to manage tables, orders, menus, analytics, and settings with multi-language support (Turkish, Bulgarian, English) and multi-currency support.

**Always reference these instructions first and fallback to search or bash commands only when you encounter unexpected information that does not match the info here.**

## Working Effectively

### Bootstrap and Dependencies
- Install dependencies: `npm install` -- takes ~35 seconds to complete. NEVER CANCEL.
- Clear cache when needed: `./clear-cache.sh` (includes Expo cache, Metro cache, npm cache)
- TypeScript validation: `npx tsc --noEmit` -- runs quickly, validates TypeScript without compilation

### Development Server
- Start development server: `npx expo start` -- Metro bundler starts in ~30 seconds. NEVER CANCEL.
- Start web version: `npx expo start --web` -- serves on http://localhost:8081. NEVER CANCEL.
- The app runs on web browser for testing and development
- **Android/iOS SDKs are NOT available in this environment** - only web development is supported

### Building
- Web build: `npx expo export --platform web` -- takes ~35 seconds, outputs to `dist/` directory. NEVER CANCEL. Set timeout to 60+ minutes.
- Production builds require EAS CLI: `npx eas build --platform android` (requires EAS account)
- **Build timing**: Web builds are fast (~35s), production mobile builds would take longer

### Project Structure
```
src/
├── components/          # Reusable UI components (PrimaryButton, StatusBadge, etc.)
├── screens/            # Main app screens (TablesScreen, MenuScreen, etc.)
├── stores/             # Zustand state management (orderStore, menuStore, etc.)
├── navigation/         # React Navigation setup
├── types/              # TypeScript type definitions
├── utils/              # Helper functions and sample data
├── constants/          # App constants and configuration
├── contexts/           # React contexts (Theme, Notification, etc.)
├── services/           # Business logic services
└── i18n/              # Internationalization
```

## Validation

### Manual Testing Scenarios
ALWAYS test these complete user scenarios after making changes:

1. **Table Management Flow**:
   - Open http://localhost:8081 in browser
   - Navigate to "Masalar" (Tables) tab
   - Click on a table (e.g., "Pencere Kenarı")
   - Click "Masayı Aç" (Open Table)
   - Verify table opens with order interface

2. **Order Creation Flow**:
   - From an open table, click "İlk Siparişi Ekle" (Add First Order)
   - Select products from different categories (İçecekler, Ana Yemekler, Tatlılar)
   - Verify total amount updates correctly
   - Test quantity controls (+/- buttons)
   - Click "Ödeme Al" (Take Payment) to test payment flow

3. **Menu Management Flow**:
   - Navigate to "Menü" (Menu) tab
   - Test product search functionality in search box
   - Test category filtering (İçecekler, Ana Yemekler, Tatlılar)
   - Verify product display with prices and descriptions

4. **Analytics Flow**:
   - Navigate to "Analitik" (Analytics) tab
   - Test time period filters (Bugün, Bu Hafta, Bu Ay)
   - Verify charts and metrics display correctly

5. **Settings Flow**:
   - Navigate to "Ayarlar" (Settings) tab
   - Test language switching (Turkish, Bulgarian, English)
   - Test currency switching (Turkish Lira, Bulgarian Lev, Euro)
   - Test theme toggle functionality

### Code Quality
- **No linting configuration exists** - code style is maintained manually
- **No test infrastructure exists** - manual testing is required
- TypeScript compilation: `npx tsc --noEmit` validates types
- Check for React Native web compatibility when making changes

### Key Technologies
- **React Native 0.79.5** with **Expo ~53.0.0**
- **TypeScript** for type safety
- **Zustand 5.0.2** for state management
- **NativeWind** for styling (Tailwind CSS)
- **React Navigation** for navigation
- **AsyncStorage** for persistence
- **Expo Print** for PDF generation
- **React Native QR Code SVG** for QR code functionality

## Common Tasks

### Adding New Features
- Follow the existing component structure in `src/components/`
- Use TypeScript interfaces in `src/types/`
- Add new screens to `src/screens/`
- Update navigation in `src/navigation/`
- Use Zustand stores for state management
- Follow NativeWind styling patterns

### Path Aliases
The project uses TypeScript path aliases configured in `tsconfig.json` and `metro.config.js`:
- `@/*` → `src/*`
- `@/components/*` → `src/components/*`
- `@/screens/*` → `src/screens/*`
- `@/stores/*` → `src/stores/*`
- `@/types/*` → `src/types/*`
- `@/utils/*` → `src/utils/*`
- `@/constants/*` → `src/constants/*`
- `@/contexts/*` → `src/contexts/*`
- `@/navigation/*` → `src/navigation/*`

### Database and Storage
- Uses AsyncStorage for local data persistence
- Sample data is auto-loaded on first launch via `initializeSampleData()`
- Data includes predefined restaurants, tables, menu items, and categories
- No external database - all data is stored locally

### Multi-language Support
- Turkish (default), Bulgarian, and English supported
- Uses React context for localization
- Language switching available in Settings screen

### Sample Data
The app auto-loads sample data including:
- **Restaurants**: Sample restaurant with halls
- **Tables**: "Ana Salon" (4 tables), "Teras" (2 tables)
- **Menu Categories**: İçecekler (Drinks), Ana Yemekler (Main Courses), Tatlılar (Desserts)
- **Products**: Tea (₺5.00), Coffee (₺10.00), Köfte (₺35.00), Baklava (₺15.00), etc.

### Known Issues
- BOM characters have been removed from source files
- Metro vs Babel resolver conflicts have been resolved
- Path alias issues have been fixed
- Some React Native Web deprecation warnings are expected (style.resizeMode, etc.)

### Performance Notes
- Web builds are optimized for Metro bundler
- Uses React Native Reanimated for smooth animations
- Virtualized lists for performance with large datasets
- Debounced search functionality (300ms delay)

## File Reference

### Key Configuration Files
- `package.json` - Dependencies and scripts
- `app.json` - Expo configuration
- `tsconfig.json` - TypeScript configuration with path aliases
- `metro.config.js` - Metro bundler configuration with aliases
- `babel.config.js` - Babel configuration with NativeWind
- `tailwind.config.js` - Tailwind CSS configuration
- `eas.json` - EAS Build configuration

### Entry Points
- `index.js` - App entry point
- `App.tsx` - Main app component with providers
- `src/navigation/AppNavigator.tsx` - Navigation setup

### Critical Commands Summary
```bash
# Setup (run once)
npm install                           # ~35 seconds

# Development
npx expo start --web                  # Start web dev server
npx tsc --noEmit                      # Validate TypeScript

# Building
npx expo export --platform web       # Build web version (~35 seconds)

# Debugging
./clear-cache.sh                      # Clear all caches when needed
```

**CRITICAL TIMING NOTES:**
- **NEVER CANCEL** dependency installation or builds - they complete in under 60 seconds
- Set timeouts to 60+ minutes for any build commands to be safe
- Web development only - Android/iOS SDKs not available in environment
- Always test complete user scenarios in browser after changes