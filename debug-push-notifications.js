// Debug script to test push notifications
const fetch = require('node-fetch');

const ONESIGNAL_APP_ID = "3de46348-ec6d-4e68-8a4c-81536e45c73c";
const ONESIGNAL_REST_API_KEY = "os_v2_app_hxsggshmnvhgrcsmqfjw4rohhsqkzpm3jujusr4susrsp5janrsm6xhcx23tsyt63wopr44ycrxp6mnzpjhe3z2hdiwmjg5cktuwnfy";

async function testOneSignalAPI() {
  console.log('🧪 Testing OneSignal API...');
  
  try {
    // Test with a dummy player ID (this should give us information about the API response)
    const response = await fetch("https://onesignal.com/api/v1/notifications", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${ONESIGNAL_REST_API_KEY}`,
      },
      body: JSON.stringify({
        app_id: ONESIGNAL_APP_ID,
        include_player_ids: ["8d8dac15-eae3-48fa-a6a2-4ea1640387ad"],
        headings: { en: "Test Notification" },
        contents: { en: "This is a test notification" },
        data: { test: true },
      }),
    });

    const result = await response.json();
    
    console.log('📡 OneSignal API Response Status:', response.status);
    console.log('📡 OneSignal API Response:', JSON.stringify(result, null, 2));
    
    if (!response.ok) {
      console.log('❌ OneSignal API Error:', result.errors?.[0] || "Unknown error");
    } else {
      console.log('✅ OneSignal API is working!');
    }
    
  } catch (error) {
    console.error('❌ Network Error:', error.message);
  }
}

testOneSignalAPI();
