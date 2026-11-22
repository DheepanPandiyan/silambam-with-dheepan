// Course page "Your Courses":
// - Signed out: "Login to get free courses" with a Google sign-in button.
// - Signed in: the free course, plus any courses assigned to an approved student.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { createCoursePlayer } from "./course-player.js";

// The free course every signed-in student gets.
const FREE_COURSE = {
    id: "free",
    title: "Free Silambam Tutorials in English",
    youtubePlaylistId: "PLBGvJdSRBQ8k"
};

const PLAYLIST_ID_PATTERN = /^[a-zA-Z0-9_-]{10,80}$/;
const DOC_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

const GOOGLE_ICON = `<svg viewBox="0 0 48 48" aria-hidden="true" width="20" height="20">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.05 13.24l7.98 6.19C11.96 13.72 17.49 9.5 24 9.5z" transform="translate(0 4)"/>
    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.75 7.18l7.7 5.98c4.5-4.15 7.09-10.25 7.09-17.63z"/>
    <path fill="#FBBC05" d="M10.03 28.57a14.4 14.4 0 0 1 0-9.14l-7.98-6.2a24 24 0 0 0 0 21.54l7.98-6.2z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.82l-7.7-5.98c-2.13 1.43-4.87 2.28-8.2 2.28-6.51 0-12.04-4.22-14.02-10.08l-7.98 6.2C6.51 42.62 14.62 48 24 48z"/>
</svg>`;

const section = document.getElementById("my-courses");
const titleEl = document.getElementById("my-courses-title");
const statusEl = document.getElementById("myCoursesStatus");
const noteEl = document.getElementById("myCoursesNote");
const actionsEl = document.getElementById("myCoursesActions");
const contentEl = document.getElementById("myCoursesContent");
const listEl = document.getElementById("myCoursesList");
const playerRoot = document.getElementById("myCoursesPlayer");
let coursePlayer = null;

function setNote(message, link) {
    noteEl.replaceChildren();
    if (!message) {
        noteEl.hidden = true;
        return;
    }
    noteEl.append(message);
    if (link) {
        const a = document.createElement("a");
        a.href = link.href;
        a.textContent = link.text;
        noteEl.append(" ", a);
    }
    noteEl.hidden = false;
}

function showSignedOut(onSignIn) {
    titleEl.textContent = "Login to get free courses";
    statusEl.textContent = "Sign in with Google to unlock the free Silambam Tutorials in English course and watch every lesson here.";
    setNote("");
    contentEl.hidden = true;

    const button = document.createElement("button");
    button.type = "button";
    button.className = "courses-google-button";
    button.innerHTML = `${GOOGLE_ICON}<span>Continue with Google</span>`;
    button.addEventListener("click", () => onSignIn(button));
    actionsEl.replaceChildren(button);
    actionsEl.hidden = false;
}

function showCourses(courses) {
    titleEl.textContent = "Your Courses";
    statusEl.textContent = courses.length === 1
        ? "Your free course is ready. Press play to start, then use Next tutorial to move to the next lesson."
        : `You have ${courses.length} courses. Choose one below and press play.`;
    actionsEl.hidden = true;
    contentEl.hidden = false;

    listEl.replaceChildren(...courses.map((course, index) => {
        const chip = document.createElement("button");
        chip.type = "button";
        chip.className = "my-course-chip";
        chip.textContent = course.title;
        chip.setAttribute("aria-pressed", String(index === 0));
        chip.addEventListener("click", () => {
            listEl.querySelectorAll(".my-course-chip").forEach((c) => c.setAttribute("aria-pressed", "false"));
            chip.setAttribute("aria-pressed", "true");
            coursePlayer.loadPlaylist(course.youtubePlaylistId);
        });
        return chip;
    }));
    // Only show the course chooser when there is more than one course.
    listEl.hidden = courses.length < 2;

    if (!coursePlayer) {
        coursePlayer = createCoursePlayer(playerRoot, {
            playlistId: courses[0].youtubePlaylistId,
            label: "Course video player"
        });
    } else {
        coursePlayer.loadPlaylist(courses[0].youtubePlaylistId);
    }
}

// Assigned courses for an approved student (skips any that repeat the free course).
async function loadAssignedCourses(db, profile) {
    const ids = Array.isArray(profile.allowedPlaylists)
        ? [...new Set(profile.allowedPlaylists.filter((id) => typeof id === "string" && DOC_ID_PATTERN.test(id)))]
        : [];
    if (!ids.length) return [];
    const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, "tutorialPlaylists", id))));
    return snaps
        .filter((snap) => snap.exists())
        .map((snap) => ({ id: snap.id, ...snap.data() }))
        .filter((c) => typeof c.title === "string" && typeof c.youtubePlaylistId === "string"
            && PLAYLIST_ID_PATTERN.test(c.youtubePlaylistId)
            && c.youtubePlaylistId !== FREE_COURSE.youtubePlaylistId);
}

const configured = ["apiKey", "authDomain", "projectId", "appId"].every((key) =>
    typeof firebaseConfig[key] === "string" && firebaseConfig[key].length > 0 && !firebaseConfig[key].startsWith("REPLACE_"));

if (section && !configured) {
    statusEl.textContent = "Student sign-in is not available right now.";
} else if (section) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });

    async function signIn(button) {
        button.disabled = true;
        statusEl.textContent = "Opening Google sign-in…";
        try {
            await signInWithPopup(auth, provider);
        } catch (error) {
            if (error?.code === "auth/popup-blocked") {
                await signInWithRedirect(auth, provider).catch(() => {});
                return;
            }
            statusEl.textContent = (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request")
                ? "Sign-in was cancelled. Choose Continue with Google to unlock your free course."
                : "Could not sign in. Please try again, or use the Student Login page.";
            button.disabled = false;
        }
    }

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            showSignedOut(signIn);
            return;
        }

        // Every signed-in student gets the free course straight away.
        showCourses([FREE_COURSE]);

        try {
            const profileSnap = await getDoc(doc(db, "studentProfiles", user.uid));
            if (!profileSnap.exists()) {
                setNote("Please fill in your student details so DMA Silambam knows you.", { href: "profile.html", text: "Fill in My Profile →" });
                return;
            }
            const profile = profileSnap.data();
            if (profile.approved !== true) {
                setNote("");
                return;
            }
            setNote("");
            const assigned = await loadAssignedCourses(db, profile);
            if (assigned.length) showCourses([FREE_COURSE, ...assigned]);
        } catch (error) {
            // The free course still works; only the extra courses could not be loaded.
            console.error("Could not load assigned courses:", error);
        }
    });
}
