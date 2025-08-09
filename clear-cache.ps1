Write-Host "🔄 Clearing Expo and icon cache..." -ForegroundColor Yellow

# Clear Expo cache
Write-Host "📱 Clearing Expo cache..." -ForegroundColor Cyan
npx expo r -c

# Clear Metro cache  
Write-Host "🚇 Clearing Metro cache..." -ForegroundColor Cyan
npx react-native start --reset-cache

# Clear npm cache
Write-Host "📦 Clearing npm cache..." -ForegroundColor Cyan
npm cache clean --force

# Clear Expo CLI cache
Write-Host "🧹 Clearing Expo CLI cache..." -ForegroundColor Cyan
npx expo install --fix

Write-Host "✅ Cache clearing complete!" -ForegroundColor Green
Write-Host "💡 You may need to:" -ForegroundColor Blue
Write-Host "   1. Restart your development server" -ForegroundColor Blue
Write-Host "   2. Delete the app from your device and reinstall" -ForegroundColor Blue  
Write-Host "   3. Increment version in app.json for production builds" -ForegroundColor Blue
