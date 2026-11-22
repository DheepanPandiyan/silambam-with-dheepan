// Course page: free course player + "Your Courses" for signed-in, approved students.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";
import { createCoursePlayer } from "./course-player.js";

const PLAYLIST_ID_PATTERN = /^[a-zA-Z0-9_-]{10,80}$/;
const DOC_ID_PATTERN = /^[a-zA-Z0-9_-]+$/;

// Free course
const freeCourseRoot = document.getElementById("freeCoursePlayer");
if (freeCourseRoot) {
    createCoursePlayer(freeCourseRoot, {
        playlistId: freeCourseRoot.dataset.playlist,
        label: "Free Silambam Tutorials in English video player"
    });
}

// Your Courses
const section = document.getElementById("my-courses");
const statusEl = document.getElementById("myCoursesStatus");
const actionsEl = document.getElementById("myCoursesActions");
const contentEl = document.getElementById("myCoursesContent");
const listEl = document.getElementById("myCoursesList");
const playerRoot = document.getElementById("myCoursesPlayer");
let coursePlayer = null;

function showMessage(message, actions = []) {
    statusEl.textContent = message;
    contentEl.hidden = true;
    actionsEl.replaceChildren(...actions.map(({ text, href, primary }) => {
        const link = document.createElement("a");
        link.className = `btn ${primary ? "btn-primary" : "catalog-back"}`;
        link.href = href;
        link.textContent = text;
        return link;
    }));
    actionsEl.hidden = actions.length === 0;
}

function showCourses(courses) {
    statusEl.textContent = courses.length === 1
        ? "Your enrolled course is ready. Press play to start."
        : `You are enrolled in ${courses.length} courses. Choose one below.`;
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
    // Hide the chooser when there is only one course.
    listEl.hidden = courses.length < 2;

    if (!coursePlayer) {
        coursePlayer = createCoursePlayer(playerRoot, {
            playlistId: courses[0].youtubePlaylistId,
            label: "Your course video player"
        });
    } else {
        coursePlayer.loadPlaylist(courses[0].youtubePlaylistId);
    }
}

const configured = ["apiKey", "authDomain", "projectId", "appId"].every((key) =>
    typeof firebaseConfig[key] === "string" && firebaseConfig[key].length > 0 && !firebaseConfig[key].startsWith("REPLACE_"));

if (section && !configured) {
    section.hidden = true;
} else if (section) {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            showMessage("Are you a DMA Silambam student? Sign in to watch the courses you are enrolled in.", [
                { text: "Student Login", href: "login.html", primary: true }
            ]);
            return;
        }

        statusEl.textContent = "Loading your courses…";
        try {
            const profileSnap = await getDoc(doc(db, "studentProfiles", user.uid));
            if (!profileSnap.exists()) {
                showMessage("Please fill in your student details so DMA Silambam can enroll you.", [
                    { text: "Fill in My Profile", href: "profile.html", primary: true }
                ]);
                return;
            }
            const profile = profileSnap.data();
            if (profile.approved !== true) {
                showMessage("Thanks for sending your details. Your courses will appear here once DMA Silambam approves your account.", [
                    { text: "My Profile", href: "profile.html" }
                ]);
                return;
            }

            const ids = Array.isArray(profile.allowedPlaylists)
                ? [...new Set(profile.allowedPlaylists.filter((id) => typeof id === "string" && DOC_ID_PATTERN.test(id)))]
                : [];
            if (!ids.length) {
                showMessage("You are approved, but no courses are assigned to you yet. Please contact DMA Silambam.");
                return;
            }

            const snaps = await Promise.all(ids.map((id) => getDoc(doc(db, "tutorialPlaylists", id))));
            const courses = snaps
                .filter((snap) => snap.exists())
                .map((snap) => ({ id: snap.id, ...snap.data() }))
                .filter((c) => typeof c.title === "string" && typeof c.youtubePlaylistId === "string" && PLAYLIST_ID_PATTERN.test(c.youtubePlaylistId));

            if (!courses.length) {
                showMessage("Your assigned courses are not available yet. Please contact DMA Silambam.");
                return;
            }
            showCourses(courses);
        } catch (error) {
            console.error("Could not load your courses:", error);
            showMessage("Could not load your courses. Please refresh the page or try again later.");
        }
    });
}
