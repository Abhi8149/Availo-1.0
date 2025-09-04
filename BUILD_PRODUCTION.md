# Production APK Build Commands

# Option 1: EAS Build (Recommended for Play Store)
eas build --platform android --profile production

# Option 2: Local Production Build
npx expo prebuild --clean
cd android
./gradlew assembleRelease

# Option 3: Debug Build for Testing
npx expo run:android --variant release

# The APK will be generated in:
# android/app/build/outputs/apk/release/app-release.apk
