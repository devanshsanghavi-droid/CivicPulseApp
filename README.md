# CivicPulse React Native

A mobile app for reporting and tracking civic issues in your community. Built with React Native and Expo.

## Features

- 🗺️ **Interactive Map**: View and filter civic issues by location
- 📱 **Issue Reporting**: 3-step form with photos, details, and location
- 👥 **Community**: Upvote issues, comment, and discuss solutions
- 🔔 **Notifications**: Stay updated on issue status changes
- 👤 **User Profiles**: Track your contributions and activity
- 🛡️ **Admin Dashboard**: Manage issues and users (admin only)

## Tech Stack

- **React Native** with **Expo**
- **TypeScript** for type safety
- **Firebase** for authentication and data
- **React Navigation** for navigation
- **React Native Maps** for mapping
- **Google Sign-In** for authentication

## Quick Start

### Prerequisites
- Node.js 18+
- Expo CLI: `npm install -g @expo/cli`
- EAS CLI: `npm install -g eas-cli`

### Installation
```bash
# Clone the repository
git clone https://github.com/devanshsanghavi-droid/CivicPulseApp.git
cd CivicPulseApp

# Install dependencies
npm install

# Start development server
npm start
```

### Run on Device
```bash
# iOS Simulator
npm run ios

# Android Emulator
npm run android
```

## Build & Deployment

### Development Builds
```bash
# Build for testing (internal distribution)
npm run build:dev:ios
npm run build:dev:android
```

### Production Builds
```bash
# Build for app stores
npm run build:prod:ios
npm run build:prod:android

# Submit to app stores
npm run submit:prod
```

For detailed build instructions, see [BUILD_DEPLOYMENT.md](./BUILD_DEPLOYMENT.md).

## Project Structure

```
src/
├── components/     # Reusable UI components
├── context/       # React context (AppContext)
├── navigation/    # Navigation configuration
├── screens/       # App screens
├── services/      # Firebase and API services
├── styles/        # Design system and styles
└── types/         # TypeScript type definitions
```

## Key Features Implementation

### Design System
- Comprehensive design tokens in `src/styles/designSystem.ts`
- Consistent colors, typography, spacing, and shadows
- Reusable components and styling patterns

### Authentication
- Google Sign-In integration
- User role management (guest, resident, admin, super_admin)
- Secure session handling

### Data Management
- Firestore for real-time data
- AsyncStorage for local caching
- Type-safe data operations

### Navigation
- Tab navigation for main features
- Stack navigation for detailed views
- Deep linking support

## Development Workflow

1. **Local Development**: Use `npm start` for fast refresh
2. **Testing**: Create development builds with `npm run build:dev`
3. **QA**: Use preview builds with `npm run build:preview`
4. **Release**: Build and submit with `npm run build:prod` and `npm run submit:prod`

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## Configuration

### Firebase
- Add `GoogleService-Info.plist` to project root (excluded from Git)
- Configure Firebase project settings
- Update bundle ID if needed

### EAS Build
- Configure build profiles in `eas.json`
- Set up App Store and Google Play Console accounts
- Configure environment variables in EAS dashboard

## Security

- Sensitive files excluded from Git (see `.gitignore`)
- Firebase configuration properly secured
- User authentication and authorization implemented
- Admin role protection for sensitive operations

## Support

For detailed documentation:
- [BUILD_DEPLOYMENT.md](./BUILD_DEPLOYMENT.md) - Build and deployment guide
- [QUICK_START.md](./QUICK_START.md) - Development quick start

## License

This project is licensed under the MIT License.
