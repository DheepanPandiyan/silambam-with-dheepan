import { initializeApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import {
    getAuth,
    GoogleAuthProvider,
    onAuthStateChanged,
    signInWithRedirect,
    getRedirectResult
} from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const configured = ["apiKey", "authDomain", "projectId", "appId"].every((key) => {
    const value = firebaseConfig[key];
    return typeof value === "string" && value.length > 0 && !value.startsWith("REPLACE_");
});

if (configured) {
    const auth = getAuth(initializeApp(firebaseConfig));
    const googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: "select_account" });

    const shownKey = "dmaStudentLoginPromptShown";
    let authStateKnown = false;
    let signedIn = false;
    let delayElapsed = false;
    let redirectError = null;
    let returnFocus = null;

    const overlay = document.createElement("div");
    overlay.className = "login-prompt-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
        <section class="login-prompt-dialog" role="dialog" aria-modal="true" aria-labelledby="loginPromptTitle" aria-describedby="loginPromptDescription">
            <button class="login-prompt-close" type="button" aria-label="Close sign-in prompt">&times;</button>
            <div class="login-prompt-icon" aria-hidden="true">DMA</div>
            <h2 id="loginPromptTitle">Are you a DMA Silambam student?</h2>
            <p id="loginPromptDescription">Sign in with Google to open your student account, or keep browsing the course catalog.</p>
            <p class="login-prompt-status" role="status" aria-live="polite"></p>
            <button class="login-prompt-google" type="button">
                <svg viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.05 13.24l7.98 6.19C11.96 13.72 17.49 9.5 24 9.5z" transform="translate(0 4)"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.75 7.18l7.7 5.98c4.5-4.15 7.09-10.25 7.09-17.63z"/>
                    <path fill="#FBBC05" d="M10.03 28.57a14.4 14.4 0 0 1 0-9.14l-7.98-6.2a24 24 0 0 0 0 21.54l7.98-6.2z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.82l-7.7-5.98c-2.13 1.43-4.87 2.28-8.2 2.28-6.51 0-12.04-4.22-14.02-10.08l-7.98 6.2C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                <span>Continue with Google</span>
            </button>
            <button class="login-prompt-dismiss" type="button">Continue browsing</button>
        </section>`;
    document.body.append(overlay);

    const dialog = overlay.querySelector(".login-prompt-dialog");
    const closeButton = overlay.querySelector(".login-prompt-close");
    const googleButton = overlay.querySelector(".login-prompt-google");
    const dismissButton = overlay.querySelector(".login-prompt-dismiss");
    const status = overlay.querySelector(".login-prompt-status");

    function alreadyShown() {
        try {
            return sessionStorage.getItem(shownKey) === "true";
        } catch {
            return false;
        }
    }

    function markShown() {
        try {
            sessionStorage.setItem(shownKey, "true");
        } catch {
            // The prompt can still be dismissed for this page if storage is unavailable.
        }
    }

    function closePrompt() {
        overlay.hidden = true;
        document.body.classList.remove("login-prompt-open");
        if (returnFocus instanceof HTMLElement) returnFocus.focus();
    }

    function openPrompt(error = null, force = false) {
        if (!authStateKnown || signedIn || (!force && alreadyShown())) return;
        if (overlay.hidden) {
            returnFocus = document.activeElement;
            overlay.hidden = false;
            document.body.classList.add("login-prompt-open");
            if (!force) markShown();
            googleButton.focus();
        }
        if (error) {
            const code = typeof error.code === "string" ? error.code : "unknown";
            status.textContent = `Google sign-in failed. Error code: ${code}`;
        }
    }

    function errorCodeMessage(error) {
        const code = typeof error?.code === "string" ? error.code : "unknown";
        console.error("Firebase Google sign-in error:", error);
        if (code === "auth/unauthorized-domain") {
            return "This website domain is not authorized in Firebase.";
        }
        if (code === "auth/operation-not-allowed") {
            return "Google sign-in is not enabled in Firebase Authentication.";
        }
        if (code === "auth/invalid-api-key") {
            return "The Firebase web API key is invalid.";
        }
        if (code === "auth/network-request-failed") {
            return "Could not connect. Check your internet connection.";
        }
        return `Sign-in could not be completed. Error code: ${code}`;
    }

    function maybeOpenPrompt() {
        if (delayElapsed && authStateKnown && !signedIn) {
            openPrompt(redirectError, Boolean(redirectError));
        }
    }

    closeButton.addEventListener("click", closePrompt);
    dismissButton.addEventListener("click", closePrompt);
    overlay.addEventListener("click", (event) => {
        if (event.target === overlay) closePrompt();
    });
    dialog.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            event.preventDefault();
            closePrompt();
        } else if (event.key === "Tab") {
            const controls = [...dialog.querySelectorAll("button:not(:disabled), a[href]")];
            const first = controls[0];
            const last = controls[controls.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    });

    googleButton.addEventListener("click", async () => {
        googleButton.disabled = true;
        status.textContent = "Redirecting to Google…";
        try {
            await signInWithRedirect(auth, googleProvider);
        } catch (error) {
            status.textContent = errorCodeMessage(error);
            googleButton.disabled = false;
        }
    });

    onAuthStateChanged(auth, (user) => {
        signedIn = Boolean(user);
        authStateKnown = true;
        if (signedIn) closePrompt();
        else maybeOpenPrompt();
    });

    getRedirectResult(auth).catch((error) => {
        redirectError = error;
        maybeOpenPrompt();
    });

    window.setTimeout(() => {
        delayElapsed = true;
        maybeOpenPrompt();
    }, 15000);
}
