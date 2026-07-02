# Push Notifications — Wiring Guide
# Run this when ready to go live. Everything below is a placeholder until then.

## Files delivered
src/
  lib/push/
    platform.ts              ← Platform detection (isCapacitorNative, supportsWebPush)
    web-push-sender.ts       ← Server-side VAPID sender
    capacitor-push.ts        ← Native Capacitor push setup
  app/api/push/
    subscribe/route.ts       ← Save web push subscription
    send/route.ts            ← Internal: send web push to mosque subscribers
    register-token/route.ts  ← Save FCM device token from native app
  components/push/
    PushPermissionPrompt.tsx ← One-time permission ask UI
  lib/supabase/
    service.ts               ← Service role client (for bypassing RLS)
public/
  sw.js                      ← Service worker (web push handler + offline shell)
supabase/
  functions/send-push-notification/index.ts  ← Edge function for native FCM push
  migrations/device_tokens.sql               ← Run in Supabase SQL Editor
native-snippets/
  AppDelegate.swift          ← iOS (replace existing)
  MainActivity.kt            ← Android (replace existing)

---

## Phase 1: Web Push (VAPID) — Go Live Checklist

### Step 1: Generate VAPID keys
In your project root terminal:
  npx web-push generate-vapid-keys

### Step 2: Add to Vercel environment variables
  NEXT_PUBLIC_VAPID_PUBLIC_KEY   = (from above)
  VAPID_PRIVATE_KEY              = (from above)
  VAPID_CONTACT_EMAIL            = mailto:admin@masjidconnect.ca

### Step 3: Install web-push package
  npm install web-push
  npm install --save-dev @types/web-push

### Step 4: Add PushPermissionPrompt to your root layout
  import PushPermissionPrompt from '@/components/push/PushPermissionPrompt';
  // Add inside <body> in src/app/layout.tsx:
  <PushPermissionPrompt />

### Step 5: Register service worker in layout.tsx
  // Add in a useEffect inside a client component in your layout:
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js');
  }

### Step 6: Wire send triggers
  // In your announcements creation API route, add:
  await fetch('/api/push/send', {
    method: 'POST',
    body: JSON.stringify({
      mosque_id: announcementMosqueId,
      title: 'New Announcement',
      body: announcementTitle,
      url: '/announcements',
      category: 'announcement',
    }),
  });
  // Same pattern for events (category: 'event') and emergency (category: 'emergency')

---

## Phase 2: Native Push (FCM/APNS) — Go Live Checklist

### Step 1: Firebase project setup
1. Go to console.firebase.google.com → create project "Masjid Connect"
2. Add iOS app → download GoogleService-Info.plist → place in ios/App/App/
3. Add Android app → download google-services.json → place in android/app/
4. Go to Project Settings → Cloud Messaging → Apple app config
5. Upload your .p8 Auth Key (from Apple Developer Portal) — NOT .p12 (rule #7)

### Step 2: Run device_tokens migration
  In Supabase Dashboard → SQL Editor, run:
  supabase/migrations/device_tokens.sql

### Step 3: Install Capacitor push plugin
  npm install @capacitor/push-notifications
  npx cap sync

### Step 4: Replace native files
  - Copy native-snippets/AppDelegate.swift → ios/App/App/AppDelegate.swift
  - Copy native-snippets/MainActivity.kt → android/app/src/.../MainActivity.kt
  - Update package name in MainActivity.kt

### Step 5: Add Firebase pods (iOS)
  In ios/App/Podfile, inside target 'App':
    pod 'Firebase/Core'
    pod 'Firebase/Messaging'
  Then: cd ios && pod install && cd ..

### Step 6: Add Firebase gradle (Android)
  android/build.gradle → dependencies: classpath 'com.google.gms:google-services:4.3.15'
  android/app/build.gradle → bottom: apply plugin: 'com.google.gms.google-services'

### Step 7: Store Firebase service account in Supabase Vault
  Supabase Dashboard → Edge Functions → Secrets → Add:
  Name:  FIREBASE_SERVICE_ACCOUNT_JSON
  Value: (paste JSON from Firebase Console → Project Settings → Service Accounts → Generate key)

### Step 8: Deploy edge function
  supabase functions deploy send-push-notification

### Step 9: Call initNativePush in your app root
  import { initNativePush } from '@/lib/push/capacitor-push';
  // In root layout or _app useEffect:
  useEffect(() => { initNativePush(); }, []);

### Step 10: Test on real iPhone via USB (rule #2 — NEVER simulator)

---

## .gitignore additions
  android/app/google-services.json
  ios/App/App/GoogleService-Info.plist
