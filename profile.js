import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

// Fields a student may edit. Must match studentEditableFields() in firestore.rules.
const TEXT_FIELDS = ["fullName", "phone", "dateOfBirth", "city", "state", "country", "parentName", "parentPhone"];
const PHONE_PATTERN = /^[+0-9 ()-]{7,20}$/;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

const signedOutPanel = document.getElementById("profileSignedOut");
const loading = document.getElementById("profileLoading");
const form = document.getElementById("profileForm");
const photo = document.getElementById("profilePhoto");
const emailEl = document.getElementById("profileEmail");
const badge = document.getElementById("approvalBadge");
const status = document.getElementById("profileStatus");
const saveButton = document.getElementById("profileSave");

function setStatus(message, tone = "info") {
    status.textContent = message;
    status.dataset.tone = tone;
}

function setBadge(profile) {
    if (profile?.approved === true) {
        badge.textContent = "Approved student";
        badge.dataset.state = "approved";
    } else if (profile) {
        badge.textContent = "Waiting for approval";
        badge.dataset.state = "pending";
    } else {
        badge.textContent = "New student – please fill in your details";
        badge.dataset.state = "new";
    }
}

function ageFrom(dateString) {
    const dob = new Date(`${dateString}T00:00:00`);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const monthDiff = now.getMonth() - dob.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < dob.getDate())) age--;
    return age;
}

function validate(values) {
    const errors = [];
    if (!values.fullName) errors.push(["fullName", "Please enter your full name."]);
    if (!PHONE_PATTERN.test(values.phone)) errors.push(["phone", "Please enter a valid mobile number (digits, spaces, + or -)."]);
    if (!DATE_PATTERN.test(values.dateOfBirth) || Number.isNaN(Date.parse(values.dateOfBirth)) || ageFrom(values.dateOfBirth) < 2 || ageFrom(values.dateOfBirth) > 100) {
        errors.push(["dateOfBirth", "Please enter a valid date of birth."]);
    }
    if (!values.city) errors.push(["city", "Please enter your city or town."]);
    if (values.parentPhone && !PHONE_PATTERN.test(values.parentPhone)) {
        errors.push(["parentPhone", "Please enter a valid parent / guardian phone number."]);
    }
    if (DATE_PATTERN.test(values.dateOfBirth) && ageFrom(values.dateOfBirth) < 18) {
        if (!values.parentName) errors.push(["parentName", "Students under 18 must add a parent / guardian name."]);
        if (!values.parentPhone) errors.push(["parentPhone", "Students under 18 must add a parent / guardian phone number."]);
    }
    return errors;
}

const configured = ["apiKey", "authDomain", "projectId", "appId"].every((key) =>
    typeof firebaseConfig[key] === "string" && firebaseConfig[key].length > 0 && !firebaseConfig[key].startsWith("REPLACE_"));

if (!configured) {
    loading.textContent = "Student sign-in is not connected yet.";
} else {
    const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
    const auth = getAuth(app);
    const db = getFirestore(app);
    let currentUser = null;
    let currentProfile = null;

    onAuthStateChanged(auth, async (user) => {
        currentUser = user;
        if (!user) {
            loading.hidden = true;
            form.hidden = true;
            signedOutPanel.hidden = false;
            return;
        }
        signedOutPanel.hidden = true;
        loading.hidden = false;
        loading.textContent = "Loading your profile…";

        emailEl.textContent = user.email || "";
        if (user.photoURL) {
            photo.src = user.photoURL;
            photo.hidden = false;
        }

        try {
            const snapshot = await getDoc(doc(db, "studentProfiles", user.uid));
            currentProfile = snapshot.exists() ? snapshot.data() : null;
        } catch (error) {
            console.error("Could not load student profile:", error);
            currentProfile = null;
        }

        for (const field of TEXT_FIELDS) {
            const value = currentProfile?.[field];
            if (typeof value === "string") form.elements[field].value = value;
        }
        if (!form.elements.fullName.value && user.displayName) form.elements.fullName.value = user.displayName;
        setBadge(currentProfile);
        loading.hidden = true;
        form.hidden = false;
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!currentUser) return;

        form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
        const values = Object.fromEntries(TEXT_FIELDS.map((field) => [field, form.elements[field].value.trim()]));
        const errors = validate(values);
        if (errors.length) {
            errors.forEach(([field]) => form.elements[field].setAttribute("aria-invalid", "true"));
            form.elements[errors[0][0]].focus();
            setStatus(errors[0][1], "error");
            return;
        }

        saveButton.disabled = true;
        setStatus("Saving…");
        try {
            await setDoc(doc(db, "studentProfiles", currentUser.uid), {
                ...values,
                email: currentUser.email || "",
                updatedAt: serverTimestamp()
            }, { merge: true });
            currentProfile = { ...(currentProfile || {}), ...values };
            setBadge(currentProfile);
            setStatus(currentProfile.approved === true
                ? "Your details have been saved."
                : "Your details have been saved. DMA Silambam will review and approve your account.", "success");
        } catch (error) {
            console.error("Could not save student profile:", error);
            setStatus(error?.code === "permission-denied"
                ? "Could not save: the database rules do not allow this yet. Please contact DMA Silambam."
                : "Could not save your details. Please check your connection and try again.", "error");
        } finally {
            saveButton.disabled = false;
        }
    });
}
