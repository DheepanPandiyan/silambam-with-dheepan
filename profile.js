// My Profile: step-by-step student details form.
//   Step 1: old or new student
//   Old  -> Step 2: online or offline -> matching details
//   New  -> new student details
// Saved to Firestore at studentProfiles/{uid}. Must match firestore.rules.
import { initializeApp, getApps, getApp } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-auth.js";
import { getFirestore, doc, getDoc, setDoc, serverTimestamp, deleteField } from "https://www.gstatic.com/firebasejs/13.1.0/firebase-firestore.js";
import { firebaseConfig } from "./firebase-config.js";

const PHONE_PATTERN = /^[+0-9 ()-]{7,20}$/;

// Each branch: which fieldset to show and which fields it saves.
const BRANCHES = {
    online: { studentType: "old", oldStudentMode: "online", fieldset: "detailsOnline", fields: ["fullName", "courseLevel", "whatsapp", "instructor"] },
    offline: { studentType: "old", oldStudentMode: "offline", fieldset: "detailsOffline", fields: ["fullName", "location", "belt", "parentWhatsapp"] },
    new: { studentType: "new", fieldset: "detailsNew", fields: ["fullName", "age", "gender", "city", "preferredLanguage", "foundVia", "foundViaOther"] }
};

// Every field a student can write. Fields not used by the chosen branch are removed on save.
const ALL_STUDENT_FIELDS = ["studentType", "oldStudentMode", "fullName", "courseLevel", "whatsapp", "instructor",
    "location", "belt", "parentWhatsapp", "age", "gender", "city", "preferredLanguage", "foundVia", "foundViaOther"];
// Fields from the earlier version of this form, removed on the next save.
const LEGACY_FIELDS = ["phone", "dateOfBirth", "state", "country", "parentName", "parentPhone"];

const ALLOWED = {
    courseLevel: ["basic", "intermediate"],
    instructor: ["Dheepan", "Bowya"],
    location: ["Arimalam", "Keelapaniyour", "Onangudi"],
    belt: ["White", "Yellow", "Orange", "Green", "Blue", "Purple", "Brown", "Black", "Other"],
    gender: ["male", "female", "other", "prefer-not-to-say"],
    preferredLanguage: ["tamil", "english"],
    foundVia: ["instagram", "youtube", "whatsapp", "friend", "google", "other"]
};

const signedOutPanel = document.getElementById("profileSignedOut");
const loading = document.getElementById("profileLoading");
const form = document.getElementById("profileForm");
const photo = document.getElementById("profilePhoto");
const emailEl = document.getElementById("profileEmail");
const badge = document.getElementById("approvalBadge");
const stepOldMode = document.getElementById("stepOldMode");
const actions = document.getElementById("profileActions");
const status = document.getElementById("profileStatus");
const saveButton = document.getElementById("profileSave");
const coursesLink = document.getElementById("profileCoursesLink");
const foundViaSelect = document.getElementById("foundVia");
const foundViaOtherField = document.getElementById("foundViaOtherField");
const nameInputs = [...form.querySelectorAll('[data-field="fullName"]')];

function setStatus(message, tone = "info") {
    status.textContent = message;
    status.dataset.tone = tone;
}

function setBadge(profile) {
    if (profile?.approved === true) {
        badge.textContent = "Approved student";
        badge.dataset.state = "approved";
    } else if (profile?.studentType) {
        badge.textContent = "Details received";
        badge.dataset.state = "pending";
    } else {
        badge.textContent = "Please fill in your details";
        badge.dataset.state = "new";
    }
}

function radioValue(name) {
    return form.querySelector(`input[name="${name}"]:checked`)?.value || "";
}

function setRadio(name, value) {
    const input = form.querySelector(`input[name="${name}"][value="${value}"]`);
    if (input) input.checked = true;
}

// Which branch is chosen right now: "online", "offline", "new" or null.
function currentBranch() {
    const type = radioValue("studentType");
    if (type === "new") return "new";
    if (type === "old") return radioValue("oldStudentMode") || null;
    return null;
}

function field(branchKey, name) {
    return document.getElementById(BRANCHES[branchKey].fieldset).querySelector(`[data-field="${name}"]`);
}

function updateVisibility() {
    const type = radioValue("studentType");
    stepOldMode.hidden = type !== "old";
    const branch = currentBranch();
    for (const [key, config] of Object.entries(BRANCHES)) {
        document.getElementById(config.fieldset).hidden = key !== branch;
    }
    foundViaOtherField.hidden = foundViaSelect.value !== "other";
    actions.hidden = !branch;
    form.querySelectorAll(".choice-card").forEach((card) => {
        card.classList.toggle("is-selected", card.querySelector("input").checked);
    });
}

// Keep the name the same in every branch, so switching does not lose it.
nameInputs.forEach((input) => {
    input.addEventListener("input", () => {
        nameInputs.forEach((other) => { if (other !== input) other.value = input.value; });
    });
});

form.addEventListener("change", (event) => {
    if (event.target.matches('input[type="radio"], #foundVia')) {
        updateVisibility();
        setStatus("");
        coursesLink.hidden = true;
        const branch = currentBranch();
        if (event.target.type === "radio" && branch) {
            // Move focus to the first empty field of the newly shown step.
            const first = BRANCHES[branch].fields.map((f) => field(branch, f)).find((el) => el && !el.value);
            first?.focus();
        }
    }
});

function readValues(branch) {
    const values = {};
    for (const name of BRANCHES[branch].fields) {
        const el = field(branch, name);
        values[name] = el.value.trim();
    }
    return values;
}

function validate(branch, v) {
    const errors = [];
    const need = (name, ok, message) => { if (!ok) errors.push([name, message]); };
    need("fullName", v.fullName.length > 0, "Please enter your name.");
    if (branch === "online") {
        need("courseLevel", ALLOWED.courseLevel.includes(v.courseLevel), "Please choose Basic or Intermediate.");
        need("whatsapp", PHONE_PATTERN.test(v.whatsapp), "Please enter a valid WhatsApp number.");
        need("instructor", ALLOWED.instructor.includes(v.instructor), "Please choose your instructor.");
    } else if (branch === "offline") {
        need("location", ALLOWED.location.includes(v.location), "Please choose your class location.");
        need("belt", ALLOWED.belt.includes(v.belt), "Please choose your belt.");
        need("parentWhatsapp", PHONE_PATTERN.test(v.parentWhatsapp), "Please enter a valid parent's WhatsApp number.");
    } else {
        const age = Number(v.age);
        need("age", Number.isInteger(age) && age >= 3 && age <= 100, "Please enter an age between 3 and 100.");
        need("gender", ALLOWED.gender.includes(v.gender), "Please choose a gender option.");
        need("city", v.city.length > 0, "Please enter your city.");
        need("preferredLanguage", ALLOWED.preferredLanguage.includes(v.preferredLanguage), "Please choose Tamil or English.");
        need("foundVia", ALLOWED.foundVia.includes(v.foundVia), "Please tell us how you found this page.");
        if (v.foundVia === "other") need("foundViaOther", v.foundViaOther.length > 0, "Please tell us where you found this page.");
    }
    return errors;
}

function buildPayload(branch, v, email) {
    const config = BRANCHES[branch];
    const data = { studentType: config.studentType, fullName: v.fullName };
    if (config.oldStudentMode) data.oldStudentMode = config.oldStudentMode;
    if (branch === "online") {
        Object.assign(data, { courseLevel: v.courseLevel, whatsapp: v.whatsapp, instructor: v.instructor });
    } else if (branch === "offline") {
        Object.assign(data, { location: v.location, belt: v.belt, parentWhatsapp: v.parentWhatsapp });
    } else {
        Object.assign(data, {
            age: Number(v.age),
            gender: v.gender,
            city: v.city,
            preferredLanguage: v.preferredLanguage,
            foundVia: v.foundVia
        });
        if (v.foundVia === "other") data.foundViaOther = v.foundViaOther;
    }
    // Remove answers from other branches and from the old form.
    for (const key of [...ALL_STUDENT_FIELDS, ...LEGACY_FIELDS]) {
        if (!(key in data)) data[key] = deleteField();
    }
    data.email = email;
    data.updatedAt = serverTimestamp();
    return data;
}

function fillForm(profile, user) {
    if (profile?.studentType === "old" || profile?.studentType === "new") {
        setRadio("studentType", profile.studentType);
        if (profile.oldStudentMode) setRadio("oldStudentMode", profile.oldStudentMode);
        const branch = profile.studentType === "new" ? "new" : profile.oldStudentMode;
        if (BRANCHES[branch]) {
            for (const name of BRANCHES[branch].fields) {
                const value = profile[name];
                if (value !== undefined && value !== null) field(branch, name).value = String(value);
            }
        }
    }
    const name = (typeof profile?.fullName === "string" && profile.fullName) || user.displayName || "";
    nameInputs.forEach((input) => { if (!input.value) input.value = name; });
    updateVisibility();
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
        fillForm(currentProfile, user);
        setBadge(currentProfile);
        loading.hidden = true;
        form.hidden = false;
    });

    form.addEventListener("submit", async (event) => {
        event.preventDefault();
        if (!currentUser) return;
        const branch = currentBranch();
        if (!branch) {
            setStatus("Please answer the questions above first.", "error");
            return;
        }

        form.querySelectorAll("[aria-invalid]").forEach((el) => el.removeAttribute("aria-invalid"));
        const values = readValues(branch);
        const errors = validate(branch, values);
        if (errors.length) {
            errors.forEach(([name]) => field(branch, name)?.setAttribute("aria-invalid", "true"));
            field(branch, errors[0][0])?.focus();
            setStatus(errors[0][1], "error");
            return;
        }

        saveButton.disabled = true;
        coursesLink.hidden = true;
        setStatus("Saving…");
        try {
            await setDoc(doc(db, "studentProfiles", currentUser.uid),
                buildPayload(branch, values, currentUser.email || ""), { merge: true });
            currentProfile = { ...(currentProfile || {}), studentType: BRANCHES[branch].studentType };
            setBadge(currentProfile);
            setStatus("Thank you! Your details have been saved.", "success");
            coursesLink.hidden = false;
        } catch (error) {
            console.error("Could not save student profile:", error);
            setStatus(error?.code === "permission-denied"
                ? "Could not save: the database rules need updating. Please contact DMA Silambam."
                : "Could not save your details. Please check your connection and try again.", "error");
        } finally {
            saveButton.disabled = false;
        }
    });
}
