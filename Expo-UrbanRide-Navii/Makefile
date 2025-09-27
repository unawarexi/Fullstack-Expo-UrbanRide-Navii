# ==============================
# Expo / React Native Commands
# ==============================

.PHONY: start start-clean ios ios-device android android-device prebuild clean-build rn-start ios-clean android-clean eas-login eas-build-dev eas-build-preview eas-build-prod eas-submit adb-devices ios-list migrate generate db-push db-reset studio


# Start Metro Bundler
start:
	npx expo start

# Start Metro Bundler with cache clear
start-clean:
	npx expo start -c

# Run iOS in simulator (development build)
ios:
	npx expo run:ios

# Run iOS on specific device (e.g., iPhone 15)
ios-device:
	npx expo run:ios --device "iPhone 16 Pro"

# Run Android in emulator (development build)
android:
	npx expo run:android

# Run Android on specific device (USB or emulator)
android-device:
	npx expo run:android --TECNO_CI8

# Prebuild native projects (generates ios/ and android/)
prebuild:
	npx expo prebuild

# Clean native builds and rebuild
clean-build:
	rm -rf ios android
	npx expo prebuild
# 	npx expo run:ios

# ==============================
# Native React Native Commands
# ==============================

# Start React Native Metro manually (if needed)
rn-start:
	npx react-native start

# Clean iOS build cache
ios-clean:
	cd ios && xcodebuild clean && cd ..

# Clean Android build cache
android-clean:
	cd android && ./gradlew clean && cd ..

# ==============================
# EAS (Expo Application Services)
# ==============================

# Login to EAS
eas-login:
	npx eas login

# Build for development client
eas-build-dev:
	npx eas build --profile development --platform all

# Build for preview
eas-build-preview:
	npx eas build --profile preview --platform all

# Build for production release
eas-build-prod:
	npx eas build --profile production --platform all

# Submit builds to App Store / Play Store
eas-submit:
	npx eas submit --platform all

# ==============================
# Utility
# ==============================

# Show connected Android devices
adb-devices:
	adb devices

# List available iOS simulators
ios-list:
	xcrun simctl list devices

# ==============================
# Prisma Commands
# ==============================

# Create a new migration after schema changes
migrate:
	npx prisma migrate dev

# Generate Prisma client (after schema changes)
generate:
	npx prisma generate

# Push schema changes to the database without creating a migration
db-push:
	npx prisma db push

# Drop/reset the database (dangerous, use with caution)
db-reset:
	npx prisma migrate reset

# View the Prisma Studio (GUI for DB)
studio:
	npx prisma studio
