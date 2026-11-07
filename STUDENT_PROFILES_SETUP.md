# Student profiles and tutorial access

The student page uses Google sign-in, shows an approved student's private profile, and displays a chapter dropdown containing only assigned tutorials. Tutorial records are protected by Firestore rules; the website fetches only chapter IDs assigned to that student's profile.

## Enable Firestore and publish rules

1. In Firebase Console, open the `dma-silambam` project.
2. Open **Build → Firestore Database** and create a database in **Production mode**.
3. Open the **Rules** tab, replace the starter rules with the contents of `firestore.rules`, and publish them.

Do not use test mode for student records.

## Add a tutorial chapter

For each YouTube video:

1. Make the video **Unlisted** in YouTube Studio.
2. In **Firestore Database → Data**, create a collection named `tutorials` (if it does not exist).
3. Create a document with a simple chapter ID, such as `chapter-01`.
4. Add:
   - `title` — string, such as `Chapter 1: Basic grip`
   - `videoId` — string, the 11-character YouTube video ID from its link

The site embeds the assigned video and also offers an **Open this video on YouTube** link. Unlisted videos can be watched by anyone who gets the link, so this controls which chapters appear on the student page but does not prevent an invited student from sharing a link.

## Add or approve a student

1. Have the student sign in with their own Google account once. They must use that same account each time.
2. In Firebase Console, open **Authentication → Users** and copy the student's **UID**.
3. In **Firestore Database → Data**, create a document in `studentProfiles` whose document ID is that UID.
4. Add:
   - `fullName` — string, the student's name
   - `dateOfBirth` — string in `YYYY-MM-DD` format (for example, `2012-04-23`)
   - `approved` — boolean, set to `true` to approve access
   - `allowedChapters` — array of chapter document IDs this student may view, such as `[`chapter-01`, `chapter-02`]`

To revoke a chapter, remove its ID from `allowedChapters`. To suspend a student, set `approved` to `false`.

Students can read only their own profile and assigned tutorial documents. They cannot list or edit records. Project administrators manage the records in Firebase Console.

## Privacy

A date of birth is personal information. Add it only when needed, keep Firebase project access limited to trusted administrators, and do not put student names or birth dates in website files or GitHub.
