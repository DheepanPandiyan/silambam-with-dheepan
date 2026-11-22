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

Approved students see their assigned playlists under **Your Courses** on the Courses page (`courses.html#my-courses`). Each playlist plays in the site's own player with Previous / Next tutorial, volume, speed and full-screen controls. If a student has more than one course, buttons above the player let them switch.

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

## Students fill in their own details (My Profile)

Every page has a profile icon at the top right. A signed-in student can open **My Profile** (`profile.html`) and fill in:

- full name, mobile/WhatsApp number, date of birth (required)
- city (required), state, country
- parent/guardian name and phone (required by the form for students under 18)

Saving creates or updates `studentProfiles/{their UID}` with these fields plus `email` and `updatedAt`. New students appear there without `approved`. To approve one, open the document in Firebase Console, add `approved` = `true` and their `allowedPlaylists`.

The Firestore rules stop students from setting `approved` or `allowedPlaylists` themselves. **After changing `firestore.rules`, paste it into Firestore Database → Rules again and click Publish**, or saving the form will fail with "permission denied".

## Privacy

A date of birth is personal information. Add it only when needed, keep Firebase project access limited to trusted administrators, and do not put student names or birth dates in website files or GitHub.
