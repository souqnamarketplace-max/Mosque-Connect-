// ── ios/App/App/AppDelegate.swift ─────────────────────────────────────────────
//
// CRITICAL RULE #1: FCM token MUST be posted as String, NOT Data.
// Posting as Data causes Capacitor to HEX-encode it → corrupted token
// → FCM silently rejects → push never arrives, no error shown.
//
// Replace the existing AppDelegate.swift content with this:

import UIKit
import Capacitor
import Firebase
import FirebaseMessaging

@UIApplicationMain
class AppDelegate: UIResponder, UIApplicationDelegate, MessagingDelegate {

  var window: UIWindow?

  func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {

    // MUST be first call (rule #13)
    FirebaseApp.configure()

    Messaging.messaging().delegate = self

    return true
  }

  // ── CRITICAL: Token as String, NOT Data (rule #1) ──────────────────────────
  func messaging(_ messaging: Messaging, didReceiveRegistrationToken fcmToken: String?) {
    guard let token = fcmToken else { return }

    NotificationCenter.default.post(
      name: Notification.Name("FCMToken"),
      object: nil,
      userInfo: ["token": token]   // ← String, never Data
    )
  }

  // Required Capacitor lifecycle methods
  func application(_ app: UIApplication,
                   open url: URL,
                   options: [UIApplication.OpenURLOptionsKey: Any] = [:]) -> Bool {
    return ApplicationDelegateProxy.shared.application(app, open: url, options: options)
  }

  func application(_ application: UIApplication,
                   continue userActivity: NSUserActivity,
                   restorationHandler: @escaping ([UIUserActivityRestoring]?) -> Void) -> Bool {
    return ApplicationDelegateProxy.shared.application(
      application, continue: userActivity, restorationHandler: restorationHandler
    )
  }
}

// ── Steps to wire this up ──────────────────────────────────────────────────────
// 1. Add GoogleService-Info.plist to ios/App/App/ in Xcode (drag into project target)
// 2. Add to Podfile:
//      pod 'Firebase/Messaging'
//      pod 'Firebase/Core'
//    Then run: cd ios && pod install
// 3. Replace ios/App/App/AppDelegate.swift with this file
// 4. Test on a REAL iPhone via USB — simulator cannot receive push (rule #2)
