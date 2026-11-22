// Profile icon in the top-right of the navbar.
// Signed out: a person icon that links to the login page.
// Signed in: the student's Google photo (or initial) with a small menu.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { firebaseConfig } from "./firebase-config.js";

const navContainer = document.querySelector(".nav-container");

if (navContainer) {
    const wrap = document.createElement("div");
    wrap.className = "nav-profile";
    wrap.innerHTML = `
        <a class="nav-profile-button" href="login.html" aria-label="Student login" title="Student login">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a4.5 4.5 0 1 0 0-9 4.5 4.5 0 0 0 0 9Zm0 2c-4.42 0-8 2.24-8 5v2h16v-2c0-2.76-3.58-5-8-5Z"/></svg>
        </a>
        <div class="nav-profile-menu" role="menu" hidden>
            <p class="nav-profile-name"></p>
            <p class="nav-profile-email"></p>
            <a href="profile.html" role="menuitem">My Profile</a>
            <a href="courses.html#my-courses" role="menuitem">My Courses</a>
            <button type="button" role="menuitem" class="nav-profile-signout">Sign out</button>
        </div>`;
    const hamburger = navContainer.querySelector(".hamburger");
    navContainer.insertBefore(wrap, hamburger);

    const button = wrap.querySelector(".nav-profile-button");
    const menu = wrap.querySelector(".nav-profile-menu");
    const nameEl = wrap.querySelector(".nav-profile-name");
    const emailEl = wrap.querySelector(".nav-profile-email");
    const signOutButton = wrap.querySelector(".nav-profile-signout");
    const defaultIcon = button.innerHTML;
    let signedIn = false;

    const closeMenu = () => {
        menu.hidden = true;
        button.setAttribute("aria-expanded", "false");
    };

    button.addEventListener("click", (event) => {
        if (!signedIn) return; // plain link to login.html
        event.preventDefault();
        menu.hidden = !menu.hidden;
        button.setAttribute("aria-expanded", String(!menu.hidden));
    });
    document.addEventListener("click", (event) => {
        if (!wrap.contains(event.target)) closeMenu();
    });
    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && !menu.hidden) {
            closeMenu();
            button.focus();
        }
    });

    const configured = ["apiKey", "authDomain", "projectId", "appId"].every((key) =>
        typeof firebaseConfig[key] === "string" && firebaseConfig[key].length > 0 && !firebaseConfig[key].startsWith("REPLACE_"));

    if (configured) {
        const auth = getAuth(getApps().length ? getApp() : initializeApp(firebaseConfig));

        signOutButton.addEventListener("click", async () => {
            closeMenu();
            await signOut(auth);
            window.location.href = "index.html";
        });

        onAuthStateChanged(auth, (user) => {
            signedIn = Boolean(user);
            closeMenu();
            if (!user) {
                button.innerHTML = defaultIcon;
                button.href = "login.html";
                button.setAttribute("aria-label", "Student login");
                button.title = "Student login";
                button.removeAttribute("aria-haspopup");
                button.classList.remove("is-signed-in");
                return;
            }
            const displayName = user.displayName || "Student";
            button.href = "profile.html";
            button.setAttribute("aria-label", `Account menu for ${displayName}`);
            button.title = displayName;
            button.setAttribute("aria-haspopup", "menu");
            button.setAttribute("aria-expanded", "false");
            button.classList.add("is-signed-in");
            button.replaceChildren();
            if (user.photoURL) {
                const img = document.createElement("img");
                img.src = user.photoURL;
                img.alt = "";
                img.referrerPolicy = "no-referrer";
                img.addEventListener("error", () => { button.textContent = displayName.charAt(0).toUpperCase(); });
                button.append(img);
            } else {
                button.textContent = displayName.charAt(0).toUpperCase();
            }
            nameEl.textContent = displayName;
            emailEl.textContent = user.email || "";
        });
    }
}
