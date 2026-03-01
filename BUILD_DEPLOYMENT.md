# CivicPulse React Native - Build & Deployment Guide

## Overview
This guide covers building and deploying the CivicPulse React Native app using Expo Application Services (EAS).

## Prerequisites
- Expo CLI installed: `npm install -g @expo/cli`
- EAS CLI installed: `npm install -g eas-cli`
- Logged into Expo: `expo login`
- Logged into EAS: `eas login`
- Apple Developer Account (for iOS builds)
- Google Play Console Account (for Android builds)

## Build Profiles

### 1. Development Build
**Purpose**: Internal testing with development client and fast refresh
**Distribution**: Internal (TestFlight/Ad Hoc for testing)

```bash
# Build for both platforms
npm run build:dev

# Platform-specific builds
npm run build:dev:ios
npm run build:dev:android
```

**Features**:
- Development client with fast refresh
- Internal distribution for team testing
- Medium resource class for cost efficiency
- Debugging capabilities enabled

### 2. Preview Build
**Purpose**: Stakeholder review and QA testing
**Distribution**: Internal (TestFlight/Ad Hoc)

```bash
# Build for both platforms
npm run build:preview

# Platform-specific builds
npm run build:preview:ios
npm run build:preview:android
```

**Features**:
- Production-like build without app store distribution
- Internal distribution for stakeholder testing
- Medium resource class for cost efficiency
- Optimized performance

### 3. Production Build
**Purpose**: App Store submission and public release
**Distribution**: App Store & Google Play Store

```bash
# Build for both platforms
npm run build:prod

# Platform-specific builds
npm run build:prod:ios
npm run build:prod:android
```

**Features**:
- Auto-increment version numbers
- Production optimizations
- App Store ready builds
- Medium resource class for cost efficiency

## Deployment Commands

### Submit to App Stores
```bash
# Submit production builds to app stores
npm run submit:prod
```

## Development Workflow

### 1. Local Development
```bash
# Start development server
npm start

# Run on device/simulator
npm run ios     # iOS Simulator
npm run android # Android Emulator/Device
```

### 2. Create Development Build
```bash
# Build development version for testing
npm run build:dev:ios

# Install on device (iOS)
# Scan QR code from build output or:
eas build:view
```

### 3. Testing & QA
```bash
# Create preview build for stakeholders
npm run build:preview:ios
npm run build:preview:android
```

### 4. Production Release
```bash
# Build production versions
npm run build:prod:ios
npm run build:prod:android

# Submit to app stores
npm run submit:prod
```

## Configuration Files

### EAS Configuration (`eas.json`)
- **Development**: Uses development client, internal distribution
- **Preview**: Production-like build, internal distribution
- **Production**: App store distribution with auto-increment

### App Configuration (`app.json`)
- Bundle ID: `com.civicpulse.app`
- Version management handled by EAS
- Firebase integration configured
- Permissions for location, camera, and photo library

## Build Monitoring

### View Build Status
```bash
# View all builds
eas build:list

# View specific build
eas build:view [build-id]
```

### Download Builds
```bash
# Download latest build
eas build:download

# Download specific build
eas build:download [build-id]
```

## Troubleshooting

### Common Issues

1. **Build Failures**
   - Check EAS dashboard for detailed logs
   - Verify bundle identifier availability
   - Ensure provisioning profiles are valid

2. **Firebase Configuration**
   - Verify GoogleService-Info.plist is in project root
   - Check Firebase project settings
   - Ensure bundle ID matches Firebase configuration

3. **Resource Class Issues**
   - Upgrade resource class if builds are slow
   - Monitor build costs in EAS dashboard

### Getting Help
- Expo documentation: https://docs.expo.dev/
- EAS documentation: https://docs.expo.dev/build/introduction/
- Firebase documentation: https://firebase.google.com/docs

## Security Notes

### Sensitive Files
- `GoogleService-Info.plist` is excluded from Git (see .gitignore)
- App Store credentials stored in environment variables
- Service account keys for Google Play stored securely

### Environment Variables
Set up in EAS dashboard:
- `@apple-app-specific-password`: For App Store uploads
- Android service account key for Google Play Console

## Cost Management

### Build Costs
- Development builds: Free (with limitations)
- Preview builds: Free (with limitations)
- Production builds: Free (with limitations)
- Resource classes affect build speed and cost

### Optimization
- Use `m1-medium` for iOS builds (M1 Macs)
- Use `medium` for Android builds
- Monitor usage in EAS dashboard

## Release Checklist

### Before Production Build
- [ ] Test all features on development build
- [ ] Verify Firebase configuration
- [ ] Check app permissions descriptions
- [ ] Update app version if needed
- [ ] Test on multiple devices/screen sizes
- [ ] Verify Google Sign-In functionality
- [ ] Test location services
- [ ] Test camera and photo picker
- [ ] Review app store metadata

### After Production Build
- [ ] Test production build thoroughly
- [ ] Verify app store screenshots
- [ ] Update app store descriptions
- [ ] Submit for review
- [ ] Monitor review status

## Continuous Integration

### GitHub Actions (Optional)
Set up CI/CD pipeline for automated builds:
- Trigger on push to main branch
- Run preview builds for PRs
- Auto-submit production builds on tags

### Environment Setup
- Development: Local development with fast refresh
- Staging: Preview builds for QA
- Production: App store builds for release

This setup provides a complete build and deployment pipeline for CivicPulse React Native app using EAS services.
