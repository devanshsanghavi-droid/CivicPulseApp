# CivicPulse React Native - Quick Start Guide

## Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Development Server
```bash
npm start
```

### 3. Run on Device/Simulator
```bash
# iOS Simulator
npm run ios

# Android Emulator/Device  
npm run android
```

### 4. Development Build (for testing on device)
```bash
# Build development version
npm run build:dev:ios

# Install on device via QR code or TestFlight
```

## Key Development Commands

| Command | Purpose |
|---------|---------|
| `npm start` | Start Expo development server |
| `npm run ios` | Run on iOS Simulator |
| `npm run android` | Run on Android Emulator |
| `npm run build:dev` | Create development build |
| `npm run build:preview` | Create preview build |
| `npm run build:prod` | Create production build |
| `npm run submit:prod` | Submit to app stores |

## Testing Features

### Core Functionality
- [ ] Google Sign-In authentication
- [ ] Location services and map display
- [ ] Camera and photo picker
- [ ] Issue reporting (3-step form)
- [ ] Feed filtering and sorting
- [ ] Issue details and comments
- [ ] User profile and settings
- [ ] Admin dashboard (if admin user)

### Test Users
- **Regular User**: Any Google account
- **Admin User**: `notdev42@gmail.com` or `civicpulsehelpdesk@gmail.com`

## Common Development Issues

### Firebase Configuration
- Ensure `GoogleService-Info.plist` is in project root
- Check Firebase project settings match bundle ID `com.civicpulse.app`

### Build Issues
- Clear Expo cache: `expo r -c`
- Reset node_modules: `rm -rf node_modules && npm install`
- Check EAS configuration in `eas.json`

### Navigation Issues
- Verify nested navigation types in `AppNavigator.tsx`
- Check tab navigation parameters

## Production Deployment

See [BUILD_DEPLOYMENT.md](./BUILD_DEPLOYMENT.md) for complete build and deployment instructions.

## Support

- Expo documentation: https://docs.expo.dev/
- React Native documentation: https://reactnative.dev/
- Firebase documentation: https://firebase.google.com/docs
