import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithRedirect,
    getRedirectResult,
    signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const signInPanel = document.getElementById("loginSignIn");
const accountPanel = document.getElementById("studentAccount");
const signInButton = document.getElementById("googleSignIn");
const signOutButton = document.getElementById("googleSignOut");
const statusMessage = document.getElementById("authStatus");
const accountStatusMessage = document.getElementById("accountStatus");
const studentName = document.getElementById("studentName");
const studentEmail = document.getElementById("studentEmail");
const studentPhoto = document.getElementById("studentPhoto");
const studentDateOfBirth = document.getElementById("studentDateOfBirth");

function setStatus(message, tone = "info") {
    statusMessage.textContent = message;
    statusMessage.dataset.tone = tone;
    accountStatusMessage.textContent = message;
    accountStatusMessage.dataset.tone = tone;
}

function showSignedOut() {
    signInPanel.hidden = false;
    accountPanel.hidden = true;
}

function describeAuthError(error) {
    console.error("Firebase Google sign-in error:", error);
    const code = typeof error?.code === "string" ? error.code : "unknown";
    let message = "Google sign-in could not be completed.";
    if (code === "auth/unauthorized-domain") {
        message = "This website domain is not authorized in Firebase yet.";
    } else if (code === "auth/operation-not-allowed") {
        message = "Google sign-in is not enabled in Firebase Authentication yet.";
    } else if (code === "auth/network-request-failed") {
        message = "Could not connect. Check your internet connection and try again.";
    } else if (code === "auth/invalid-api-key") {
        message = "The Firebase API key is invalid. Check the web app configuration.";
    }
    return `${message} (Error code: ${code})`;
}

function formatDateOfBirth(value) {
    if (typeof value !== "string" || !/^\\d{4}-\\d{2}-\\d{2}$/.test(value)) {
        return "";
    }
    const [year, month, day] = value.split("-");
    return `${day}/${month}/${year}`;
}

async function showSignedInUser(user, db) {
    signInPanel.hidden = true;
    accountPanel.hidden = false;
    studentName.textContent = user.displayName || "DMA Silambam student";
    studentEmail.textContent = user.email || "";
    studentDateOfBirth.hidden = true;
    studentDateOfBirth.textContent = "";
    if (user.photoURL) {
        studentPhoto.src = user.photoURL;
        studentPhoto.alt = user.displayName ? `${user.displayName}'s profile photo` : "Student profile photo";
        studentPhoto.hidden = false;
    } else {
        studentPhoto.hidden = true;
    }

    setStatus("Checking your student profile…");
    if (!user.emailVerified) {
        setStatus("Please use a verified Google account for your student profile.", "error");
        return;
    }

    try {
        const profileSnapshot = await getDoc(doc(db, "studentProfiles", user.uid));
        if (!profileSnapshot.exists() || profileSnapshot.data().approved !== true) {
            setStatus("Your Google sign-in worked. Your student profile is waiting for approval. Please contact DMA Silambam.", "info");
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
    setStatus("Google sign-in is not connected yet. Firebase setup is needed first.");
} else {
    const app = initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    setStatus("Sign in with your Google account to continue.");
    onAuthStateChanged(auth, (user) => {
        if (user) {
            showSignedInUser(user, db);
        } else {
            showSignedOut();
        }
    });

    getRedirectResult(auth).catch((error) => {
        setStatus(describeAuthError(error), "error");
    });

    signInButton.disabled = false;
    signInButton.addEventListener("click", async () => {
        signInButton.disabled = true;
        setStatus("Redirecting to Google…");
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            setStatus(describeAuthError(error), "error");
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
