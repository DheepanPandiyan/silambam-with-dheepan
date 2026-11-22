import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, getRedirectResult, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const signInPanel = document.getElementById("loginSignIn");
const accountPanel = document.getElementById("studentAccount");
const googleSignInButton = document.getElementById("googleSignIn");
const signOutButton = document.getElementById("emailPasswordSignOut");
const statusMessage = document.getElementById("authStatus");
const accountStatusMessage = document.getElementById("accountStatus");
const studentName = document.getElementById("studentName");
const studentEmail = document.getElementById("studentEmail");
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
    // Firebase reports this code with stray punctuation ("auth/api-key-not-valid.-please-pass-..."), so match by prefix.
    if (code.startsWith("auth/api-key-not-valid")) {
        return `The Firebase API key is invalid. Replace it in firebase-config.js using your Firebase web app settings. (Error code: ${code})`;
    }
    const messages = {
        "auth/operation-not-allowed": "Google sign-in is not enabled in Firebase Authentication yet.",
        "auth/invalid-api-key": "The Firebase API key is invalid. Replace it in firebase-config.js using your Firebase web app settings.",
        "auth/api-key-not-valid-please-pass-a-valid-api-key": "The Firebase API key is invalid. Replace it in firebase-config.js using your Firebase web app settings.",
        "auth/unauthorized-domain": "This website domain is not authorized in Firebase yet.",
        "auth/network-request-failed": "Could not connect. Check your internet connection and try again.",
        "auth/too-many-requests": "Too many attempts. Wait a little while, then try again."
    };
    return `${messages[code] || "Could not sign in with Google. Please try again."} (Error code: ${code})`;
}

function formatDateOfBirth(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return "";
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
    setStatus("Checking your student profile…");
    try {
        const snapshot = await getDoc(doc(db, "studentProfiles", user.uid));
        if (!snapshot.exists()) {
            // New student: take them to the details form.
            setStatus("Welcome! Taking you to My Profile to fill in your details…");
            window.location.href = "profile.html";
            return;
        }
        if (snapshot.data().approved !== true) {
            setStatus("Thanks for sending your details. Your account is waiting for approval from DMA Silambam.");
            return;
        }
        const profile = snapshot.data();
        studentName.textContent = profile.fullName || user.displayName || "DMA Silambam student";
        const dateOfBirth = formatDateOfBirth(profile.dateOfBirth);
        if (dateOfBirth) {
            studentDateOfBirth.textContent = `Date of birth: ${dateOfBirth}`;
            studentDateOfBirth.hidden = false;
        }
        setStatus("Your student profile is approved. Your courses are on the Courses page.", "success");
    } catch (error) {
        console.error("Could not load student profile:", error);
        setStatus("You are signed in, but your student profile could not be loaded. Please try again later.", "error");
    }
}

const configured = ["apiKey", "authDomain", "projectId", "appId"].every((key) => typeof firebaseConfig[key] === "string" && firebaseConfig[key].length > 0 && !firebaseConfig[key].startsWith("REPLACE_"));

if (!configured) {
    googleSignInButton.disabled = true;
    setStatus("Student sign-in is not connected yet. Firebase setup is needed first.");
} else {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    const provider = new GoogleAuthProvider();
    provider.setCustomParameters({ prompt: "select_account" });
    setStatus("Choose Continue with Google to sign in.");
    onAuthStateChanged(auth, (user) => user ? showSignedInUser(user, db) : showSignedOut());
    googleSignInButton.disabled = false;
    googleSignInButton.addEventListener("click", async () => {
        googleSignInButton.disabled = true;
        setStatus("Opening Google sign-in…");
        try {
            // Pop-up sign-in works on sites not hosted by Firebase (e.g. Vercel, localhost).
            // Redirect sign-in loses the result there because browsers partition third-party storage.
            await signInWithPopup(auth, provider);
        } catch (error) {
            if (error?.code === "auth/popup-blocked") {
                // Pop-ups blocked: fall back to the full-page redirect.
                setStatus("Redirecting to Google…");
                try {
                    await signInWithRedirect(auth, provider);
                    return;
                } catch (redirectError) {
                    error = redirectError;
                }
            }
            if (error?.code === "auth/popup-closed-by-user" || error?.code === "auth/cancelled-popup-request") {
                setStatus("Sign-in was cancelled. Choose Continue with Google to try again.");
            } else {
                setStatus(describeAuthError(error), "error");
            }
            googleSignInButton.disabled = false;
        }
    });
    getRedirectResult(auth).catch((error) => setStatus(describeAuthError(error), "error"));
    signOutButton.addEventListener("click", async () => {
        signOutButton.disabled = true;
        try {
            await signOut(auth);
            setStatus("You have been signed out.");
        } catch {
            setStatus("Could not sign out. Please try again.", "error");
        } finally {
            signOutButton.disabled = false;
        }
    });
}
