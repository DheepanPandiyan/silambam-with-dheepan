import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
    getAuth,
    onAuthStateChanged,
    signInWithEmailAndPassword,
    sendPasswordResetEmail,
    signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const signInPanel = document.getElementById("loginSignIn");
const accountPanel = document.getElementById("studentAccount");
const signInForm = document.getElementById("emailPasswordSignIn");
const emailInput = document.getElementById("studentLoginEmail");
const passwordInput = document.getElementById("studentLoginPassword");
const signInButton = document.getElementById("emailPasswordSignInButton");
const resetPasswordButton = document.getElementById("resetPassword");
const signOutButton = document.getElementById("emailPasswordSignOut");
const statusMessage = document.getElementById("authStatus");
const accountStatusMessage = document.getElementById("accountStatus");
const studentName = document.getElementById("studentName");
const studentEmail = document.getElementById("studentEmail");
const studentDateOfBirth = document.getElementById("studentDateOfBirth");
const tutorialsPanel = document.getElementById("studentTutorials");
const tutorialPlaylist = document.getElementById("tutorialPlaylist");
const tutorialStatus = document.getElementById("tutorialStatus");
const tutorialPlayerWrap = document.getElementById("tutorialPlayerWrap");
const tutorialPlayer = document.getElementById("tutorialPlayer");
const tutorialOpenLink = document.getElementById("tutorialOpenLink");

function setStatus(message, tone = "info") {
    statusMessage.textContent = message;
    statusMessage.dataset.tone = tone;
    accountStatusMessage.textContent = message;
    accountStatusMessage.dataset.tone = tone;
}

function showSignedOut() {
    signInPanel.hidden = false;
    accountPanel.hidden = true;
    tutorialsPanel.hidden = true;
    tutorialPlayer.removeAttribute("src");
    passwordInput.value = "";
}

function describeAuthError(error) {
    console.error("Firebase email/password sign-in error:", error);
    const code = typeof error?.code === "string" ? error.code : "unknown";
    let message = "Could not sign in. Check your email and password, then try again.";
    if (code === "auth/operation-not-allowed") {
        message = "Email and password sign-in is not enabled in Firebase Authentication yet.";
    } else if (code === "auth/invalid-api-key" || code === "auth/api-key-not-valid-please-pass-a-valid-api-key") {
        message = "The Firebase API key is invalid. Check the web app configuration.";
    } else if (code === "auth/network-request-failed") {
        message = "Could not connect. Check your internet connection and try again.";
    } else if (code === "auth/too-many-requests") {
        message = "Too many attempts. Wait a little while, then try again.";
    }
    return `${message} (Error code: ${code})`;
}

function formatDateOfBirth(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        return "";
    }
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

function showPlaylist(playlist) {
    const embedUrl = new URL("https://www.youtube-nocookie.com/embed");
    embedUrl.searchParams.set("listType", "playlist");
    embedUrl.searchParams.set("list", playlist.youtubePlaylistId);

    const playlistUrl = new URL("https://www.youtube.com/playlist");
    playlistUrl.searchParams.set("list", playlist.youtubePlaylistId);

    tutorialPlayer.src = embedUrl.toString();
    tutorialPlayer.title = playlist.title;
    tutorialOpenLink.href = playlistUrl.toString();
    tutorialPlayerWrap.hidden = false;
    tutorialStatus.textContent = `${playlist.title} — choose a video using the playlist controls.`;
}

async function loadStudentPlaylists(db, allowedPlaylists) {
    tutorialsPanel.hidden = false;
    tutorialPlayerWrap.hidden = true;
    tutorialPlayer.removeAttribute("src");
    tutorialPlaylist.replaceChildren();

    const playlistIds = Array.isArray(allowedPlaylists)
        ? [...new Set(allowedPlaylists.filter((id) => typeof id === "string" && /^[a-zA-Z0-9_-]+$/.test(id)))]
        : [];

    if (playlistIds.length === 0) {
        tutorialPlaylist.disabled = true;
        tutorialPlaylist.add(new Option("No playlists assigned", ""));
        tutorialStatus.textContent = "Ask DMA Silambam to assign playlists to your account.";
        return;
    }

    tutorialPlaylist.disabled = true;
    tutorialPlaylist.add(new Option("Loading your playlists…", ""));
    tutorialStatus.textContent = "";

    try {
        const snapshots = await Promise.all(playlistIds.map((playlistId) =>
            getDoc(doc(db, "tutorialPlaylists", playlistId))
        ));
        const playlists = snapshots
            .filter((snapshot) => snapshot.exists())
            .map((snapshot) => ({ id: snapshot.id, ...snapshot.data() }))
            .filter((playlist) =>
                typeof playlist.title === "string"
                && playlist.title.trim().length > 0
                && typeof playlist.youtubePlaylistId === "string"
                && /^[a-zA-Z0-9_-]{10,80}$/.test(playlist.youtubePlaylistId)
            );

        tutorialPlaylist.replaceChildren();
        if (playlists.length === 0) {
            tutorialPlaylist.disabled = true;
            tutorialPlaylist.add(new Option("No playlists available", ""));
            tutorialStatus.textContent = "No assigned playlists are available yet.";
            return;
        }

        playlists.forEach((playlist) => {
            tutorialPlaylist.add(new Option(playlist.title, playlist.id));
        });
        tutorialPlaylist.disabled = false;
        tutorialPlaylist.onchange = () => {
            const selected = playlists.find((playlist) => playlist.id === tutorialPlaylist.value);
            if (selected) showPlaylist(selected);
        };
        showPlaylist(playlists[0]);
    } catch (error) {
        console.error("Could not load assigned playlists:", error);
        tutorialPlaylist.replaceChildren(new Option("Playlists unavailable", ""));
        tutorialPlaylist.disabled = true;
        tutorialStatus.textContent = "Could not load playlists. Please try again later.";
    }
}

async function showSignedInUser(user, db) {
    signInPanel.hidden = true;
    accountPanel.hidden = false;
    tutorialsPanel.hidden = true;
    studentName.textContent = user.displayName || "DMA Silambam student";
    studentEmail.textContent = user.email || "";
    studentDateOfBirth.hidden = true;
    studentDateOfBirth.textContent = "";

    setStatus("Checking your student profile…");
    try {
        const profileSnapshot = await getDoc(doc(db, "studentProfiles", user.uid));
        if (!profileSnapshot.exists() || profileSnapshot.data().approved !== true) {
            setStatus("Your account is not approved yet. Please contact DMA Silambam.", "info");
            return;
        }

        const profile = profileSnapshot.data();
        const dateOfBirth = formatDateOfBirth(profile.dateOfBirth);
        studentName.textContent = profile.fullName || user.displayName || "DMA Silambam student";
        if (dateOfBirth) {
            studentDateOfBirth.textContent = `Date of birth: ${dateOfBirth}`;
            studentDateOfBirth.hidden = false;
        }
        setStatus("Your student profile is approved.", "success");
        await loadStudentPlaylists(db, profile.allowedPlaylists);
    } catch (error) {
        console.error("Could not load student profile:", error);
        setStatus("You’re signed in, but your student profile could not be loaded. Please try again later.", "error");
    }
}

const configured = ["apiKey", "authDomain", "projectId", "appId"].every((key) => {
    const value = firebaseConfig[key];
    return typeof value === "string" && value.length > 0 && !value.startsWith("REPLACE_");
});

if (!configured) {
    signInButton.disabled = true;
    resetPasswordButton.disabled = true;
    setStatus("Student sign-in is not connected yet. Firebase setup is needed first.");
} else {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);

    setStatus("Sign in with the student email and password provided by DMA Silambam.");
    onAuthStateChanged(auth, (user) => {
        if (user) {
            showSignedInUser(user, db);
        } else {
            showSignedOut();
        }
    });

    signInButton.disabled = false;
    resetPasswordButton.disabled = false;

    signInForm.addEventListener("submit", async (event) => {
        event.preventDefault();
        const email = emailInput.value.trim();
        const password = passwordInput.value;
        signInButton.disabled = true;
        resetPasswordButton.disabled = true;
        setStatus("Signing in…");

        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            setStatus(describeAuthError(error), "error");
        } finally {
            signInButton.disabled = false;
            resetPasswordButton.disabled = false;
        }
    });

    resetPasswordButton.addEventListener("click", async () => {
        const email = emailInput.value.trim();
        if (!email) {
            setStatus("Enter your student account email first, then choose Forgot password.");
            emailInput.focus();
            return;
        }

        resetPasswordButton.disabled = true;
        signInButton.disabled = true;
        setStatus("Sending password reset instructions…");
        try {
            await sendPasswordResetEmail(auth, email);
            setStatus("If an account exists for this email, password reset instructions have been sent.", "success");
        } catch (error) {
            setStatus(describeAuthError(error), "error");
        } finally {
            resetPasswordButton.disabled = false;
            signInButton.disabled = false;
        }
    });

    signOutButton.addEventListener("click", async () => {
        signOutButton.disabled = true;
        try {
            await signOut(auth);
            setStatus("You’ve been signed out.");
        } catch (error) {
            setStatus("Could not sign out. Please try again.", "error");
        } finally {
            signOutButton.disabled = false;
        }
    });
}
