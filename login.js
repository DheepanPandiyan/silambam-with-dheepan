import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithRedirect,
    getRedirectResult,
    signOut
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
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

function setStatus(message, tone = "info") {
    statusMessage.textContent = message;
    statusMessage.dataset.tone = tone;
    accountStatusMessage.textContent = message;
    accountStatusMessage.dataset.tone = tone;
}

function showSignedInUser(user) {
    signInPanel.hidden = true;
    accountPanel.hidden = false;
    studentName.textContent = user.displayName || "DMA Silambam student";
    studentEmail.textContent = user.email || "";
    if (user.photoURL) {
        studentPhoto.src = user.photoURL;
        studentPhoto.alt = user.displayName ? `${user.displayName}'s profile photo` : "Student profile photo";
        studentPhoto.hidden = false;
    } else {
        studentPhoto.hidden = true;
    }
    setStatus("You’re signed in with Google.", "success");
}

function showSignedOut() {
    signInPanel.hidden = false;
    accountPanel.hidden = true;
}

function describeAuthError(error) {
    if (error.code === "auth/unauthorized-domain") {
        return "This website domain is not authorized in Firebase yet.";
    }
    if (error.code === "auth/operation-not-allowed") {
        return "Google sign-in is not enabled in Firebase Authentication yet.";
    }
    if (error.code === "auth/network-request-failed") {
        return "Could not connect. Check your internet connection and try again.";
    }
    return "Google sign-in could not be completed. Please try again.";
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
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    setStatus("Sign in with your Google account to continue.");
    onAuthStateChanged(auth, (user) => {
        if (user) {
            showSignedInUser(user);
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
