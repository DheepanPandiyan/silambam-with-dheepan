# Enable student Google sign-in

The login page is at `login.html`. Google sign-in uses Firebase Authentication. The button stays disabled until a Firebase web app is configured.

## Firebase setup

1. Create a Firebase project in the [Firebase Console](https://console.firebase.google.com/).
2. Open **Authentication → Sign-in method** and enable **Google**. Choose a support email.
3. In **Project settings → Your apps**, register a web app and copy its Firebase configuration.
4. In **Authentication → Settings → Authorized domains**, add the production domain `silambam-dheepan1.vercel.app` and any custom domain used by the site.
5. Replace the placeholder values in `firebase-config.js` with the web app's `apiKey`, `authDomain`, `projectId`, and `appId`. Commit and deploy the updated config.

The Firebase web configuration is intended for client-side use. Do not put a service account key or private key in this file.

After configuration, the login page will redirect students to Google, show their signed-in profile, and let them sign out. This establishes student identity; it does not yet restrict course content to signed-in students.
