#!/bin/bash

echo "🔄 Clearing Expo and icon cache..."

# Clear Expo cache
echo "📱 Clearing Expo cache..."
npx expo r -c

# Clear Metro cache
echo "🚇 Clearing Metro cache..."
npx react-native start --reset-cache

# Clear npm cache
echo "📦 Clearing npm cache..."
npm cache clean --force

# Clear Expo CLI cache
echo "🧹 Clearing Expo CLI cache..."
npx expo install --fix

echo "✅ Cache clearing complete!"
echo "💡 You may need to:"
echo "   1. Restart your development server"
echo "   2. Delete the app from your device and reinstall"
echo "   3. Increment version in app.json for production builds"
