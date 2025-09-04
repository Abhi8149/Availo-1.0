#!/usr/bin/env node

// Quick test script to verify OneSignal configuration
const fs = require('fs');
const path = require('path');

console.log('🧪 OneSignal Configuration Test\n');

// Check if .env.local exists
const envPath = path.join(__dirname, '.env.local');
if (!fs.existsSync(envPath)) {
  console.log('❌ .env.local file not found');
  console.log('📝 Create .env.local and add your OneSignal credentials');
  process.exit(1);
}

// Read environment file
const envContent = fs.readFileSync(envPath, 'utf-8');
const hasAppId = envContent.includes('EXPO_PUBLIC_ONESIGNAL_APP_ID=');
const hasRestKey = envContent.includes('EXPO_PUBLIC_ONESIGNAL_REST_API_KEY=');

console.log('📁 Environment file check:');
console.log(`   .env.local: ${fs.existsSync(envPath) ? '✅' : '❌'}`);
console.log(`   EXPO_PUBLIC_ONESIGNAL_APP_ID: ${hasAppId ? '✅' : '❌'}`);
console.log(`   EXPO_PUBLIC_ONESIGNAL_REST_API_KEY: ${hasRestKey ? '✅' : '❌'}\n`);

// Check app.json configuration
const appJsonPath = path.join(__dirname, 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
  const hasOneSignalPlugin = appJson.expo?.plugins?.some(plugin => 
    typeof plugin === 'string' && plugin.includes('onesignal') ||
    Array.isArray(plugin) && plugin[0]?.includes('onesignal')
  );
  
  console.log('📱 App configuration check:');
  console.log(`   OneSignal plugin: ${hasOneSignalPlugin ? '✅' : '❌'}`);
  console.log(`   iOS bundle ID: ${appJson.expo?.ios?.bundleIdentifier ? '✅' : '❌'}`);
  console.log(`   Android package: ${appJson.expo?.android?.package ? '✅' : '❌'}\n`);
}

// Check if native directories exist (after prebuild)
const androidExists = fs.existsSync(path.join(__dirname, 'android'));
const iosExists = fs.existsSync(path.join(__dirname, 'ios'));

console.log('🏗️  Native code check:');
console.log(`   Android directory: ${androidExists ? '✅' : '❌'}`);
console.log(`   iOS directory: ${iosExists ? '✅' : '❌'}\n`);

console.log('📋 Next steps:');
if (!hasAppId || !hasRestKey) {
  console.log('1. Add OneSignal credentials to .env.local');
  console.log('2. Get credentials from https://onesignal.com dashboard');
}
if (!androidExists && !iosExists) {
  console.log('3. Run: npx expo prebuild --clean');
}
console.log('4. Test on physical device: npx expo run:android or npx expo run:ios');
console.log('5. Use two devices: one as customer, one as shopkeeper');
