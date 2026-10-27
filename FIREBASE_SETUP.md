# Enable student Google sign-in

The student login page is at `login.html`. The Firebase web-app configuration is already connected in `firebase-config.js`.

## Finish Firebase setup

1. In Firebase Console, open **Authentication → Sign-in method**.
2. Enable **Google**, choose a support email, and save.
3. In **Authentication → Settings → Authorized domains**, confirm that `silambam-with-dheepan.vercel.app` is listed. The screenshot provided for this project shows it is already authorized.
4. Merge and deploy the login page. Sign in from the deployed site to confirm the redirect works.

The Firebase web configuration is intended for client-side use. Do not put a service account key or private key in the repository.

After configuration, the login page redirects students to Google, shows their signed-in profile, and lets them sign out. This establishes student identity; it does not yet restrict course content to signed-in students.
