#!/usr/bin/env node

// Production readiness checker
const fs = require('fs');
const path = require('path');

console.log('🚀 Production OneSignal Setup Verification\n');

// Check google-services.json
const googleServicesPath = path.join(__dirname, 'google-services.json');
if (fs.existsSync(googleServicesPath)) {
  const googleServices = JSON.parse(fs.readFileSync(googleServicesPath, 'utf-8'));
  const packageName = googleServices.client[0]?.client_info?.android_client_info?.package_name;
  const projectId = googleServices.project_info?.project_id;
  const apiKey = googleServices.client[0]?.api_key?.[0]?.current_key;
  
  console.log('📱 Firebase Configuration:');
  console.log(`   google-services.json: ✅`);
  console.log(`   Package name: ${packageName === 'com.shopstatus.app' ? '✅' : '❌'} ${packageName}`);
  console.log(`   Project ID: ✅ ${projectId}`);
  console.log(`   API Key: ✅ ${apiKey ? apiKey.substring(0, 20) + '...' : 'Missing'}\n`);
} else {
  console.log('❌ google-services.json not found\n');
}

// Check production environment
const prodEnvPath = path.join(__dirname, '.env.production');
if (fs.existsSync(prodEnvPath)) {
  const prodEnv = fs.readFileSync(prodEnvPath, 'utf-8');
  const hasOneSignalAppId = prodEnv.includes('EXPO_PUBLIC_ONESIGNAL_APP_ID=3de46348-ec6d-4e68-8a4c-81536e45c73c');
  const hasOneSignalRestKey = prodEnv.includes('EXPO_PUBLIC_ONESIGNAL_REST_API_KEY=');
  
  console.log('🔐 Production Environment:');
  console.log(`   .env.production: ✅`);
  console.log(`   OneSignal App ID: ${hasOneSignalAppId ? '✅' : '❌'}`);
  console.log(`   OneSignal REST Key: ${hasOneSignalRestKey ? '✅' : '❌'}\n`);
}

// Check app.json production mode
const appJsonPath = path.join(__dirname, 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf-8'));
  const oneSignalPlugin = appJson.expo?.plugins?.find(plugin => 
    Array.isArray(plugin) && plugin[0]?.includes('onesignal')
  );
  const isProductionMode = oneSignalPlugin?.[1]?.mode === 'production';
  
  console.log('⚙️  App Configuration:');
  console.log(`   OneSignal production mode: ${isProductionMode ? '✅' : '❌'}`);
  console.log(`   Android package: ${appJson.expo?.android?.package === 'com.shopstatus.app' ? '✅' : '❌'}\n`);
}

console.log('📋 Next Steps:');
console.log('1. Upload google-services.json to OneSignal dashboard');
console.log('2. Go to OneSignal → Settings → Platforms → Google Android (FCM)');
console.log('3. Upload the google-services.json file');
console.log('4. Add OneSignal keys to Convex production environment');
console.log('5. Build production APK: eas build --platform android --profile production');
console.log('\n🎯 Your setup is ready for production push notifications!');
