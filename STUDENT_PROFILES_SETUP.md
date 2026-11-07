# Student profile setup

The student page uses Google sign-in and reads a private Firestore profile for the signed-in user. A profile is shown only after an administrator marks it approved.

## Enable Firestore

1. In Firebase Console, open the `dma-silambam` project.
2. Open **Build → Firestore Database** and create a database in **Production mode**.
3. Open the **Rules** tab, replace the starter rules with the contents of `firestore.rules`, and publish them.

Do not use test mode for student records.

## Add a student profile

1. Ask the student to sign in with Google once. They must use the same Google account on later visits.
2. In Firebase Console, open **Authentication → Users** and copy that student's **UID**.
3. In **Firestore Database → Data**, create a collection named `studentProfiles`.
4. Create a document whose document ID is the student's UID.
5. Add these fields:
   - `fullName` — string, the student's name
   - `dateOfBirth` — string in `YYYY-MM-DD` format (for example, `2012-04-23`)
   - `approved` — boolean, set to `true` when the profile is ready

The student's page reads only the document with their own UID. They cannot list or edit profiles. Project administrators can manage records in the Firebase Console.

## Privacy

A date of birth is personal information. Add it only when you need it, keep Firebase project access limited to trusted administrators, and do not put student names or birth dates in website files or GitHub.
