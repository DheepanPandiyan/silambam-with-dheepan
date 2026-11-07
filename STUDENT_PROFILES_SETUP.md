# Student profiles and tutorial access

Students sign in with an email address and a Firebase password created for their student account. There is no public sign-up form. The project owner creates each account, approves its Firestore profile, and assigns the playlists that student may view.

## Enable Firebase Authentication

1. In Firebase Console, open the `dma-silambam` project.
2. Open **Authentication → Sign-in method**.
3. Enable **Email/Password** and save.

The student password is a Firebase account password. Students should not give the site their Gmail password.

## Enable Firestore and publish rules

1. Open **Build → Firestore Database** and create a database in **Production mode**.
2. Open the **Rules** tab, replace the starter rules with the contents of `firestore.rules`, and publish them.

Do not use test mode for student records.

## Add a YouTube playlist

For each playlist you want students to access:

1. Set the YouTube videos to **Unlisted** and create the playlist in YouTube.
2. In **Firestore Database → Data**, create a collection named `tutorialPlaylists` (if it does not exist).
3. Create a document with a simple ID, such as `basics` or `advanced`.
4. Add:
   - `title` — string, such as `Silambam Basics`
   - `youtubePlaylistId` — string, the playlist ID from the YouTube playlist URL. For example, in `https://www.youtube.com/playlist?list=PLabc123...`, copy the value after `list=`.

The student portal shows a dropdown for assigned playlists. The selected playlist opens in an embedded YouTube player with playlist controls, so the student can choose a video. The link below it opens the full playlist on YouTube.

Unlisted videos and playlists can be watched or shared by anyone who gets the link. This controls which playlists the site displays to a student; it does not prevent link sharing.

## Create and approve a student account

1. In Firebase Console, open **Authentication → Users** and choose **Add user**.
2. Enter the student's email address and create a Firebase password for their account. This password is separate from their Gmail password. Give the initial login details to the student securely.
3. Copy the new user's **UID**.
4. In **Firestore Database → Data**, create a document in `studentProfiles` whose document ID is that UID.
5. Add:
   - `fullName` — string, the student's name
   - `dateOfBirth` — string in `YYYY-MM-DD` format (for example, `2012-04-23`)
   - `approved` — boolean, set to `true` to approve access
   - `allowedPlaylists` — array of playlist document IDs this student may view, such as [`basics`, `advanced`]

The student can then sign in at the website using that email and Firebase password. There is no self-registration form. The login page's **Forgot password?** link emails a reset link to that account's address.

Each student's playlist array can be different. To revoke a playlist, remove its ID from `allowedPlaylists`. To suspend a student, set `approved` to `false`.

Students can read only their own profile and assigned playlist documents. They cannot list or edit records. Project administrators manage the accounts and records in Firebase Console.

## Privacy

A date of birth is personal information. Add it only when needed, keep Firebase project access limited to trusted administrators, and do not put student names or birth dates in website files or GitHub.
