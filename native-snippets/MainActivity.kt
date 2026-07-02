// ── android/app/src/main/java/.../MainActivity.kt ────────────────────────────
//
// Android 8+ requires a notification channel or ALL notifications are
// silently dropped (rule #14). Add createNotificationChannel() below.

package com.masjidconnect.app  // ← update to your actual package name

import android.app.NotificationChannel
import android.app.NotificationManager
import android.os.Build
import android.os.Bundle
import com.getcapacitor.BridgeActivity

class MainActivity : BridgeActivity() {

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(savedInstanceState)
    createNotificationChannel()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      val channelId   = "mc_default"
      val channelName = "Masjid Connect"
      val importance  = NotificationManager.IMPORTANCE_HIGH

      val channel = NotificationChannel(channelId, channelName, importance).apply {
        description = "Prayer times, announcements, and mosque events"
        enableVibration(true)
        enableLights(true)
      }

      val manager = getSystemService(NotificationManager::class.java)
      manager?.createNotificationChannel(channel)
    }
  }
}

// ── Steps to wire this up ──────────────────────────────────────────────────────
// 1. Place google-services.json in android/app/ (add to .gitignore — rule #12)
// 2. In android/build.gradle (project level), add to dependencies:
//      classpath 'com.google.gms:google-services:4.3.15'
// 3. In android/app/build.gradle, add at bottom:
//      apply plugin: 'com.google.gms.google-services'
// 4. Replace MainActivity.kt with this file (update package name)
