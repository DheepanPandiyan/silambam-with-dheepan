// Course video player: a YouTube playlist with our own control bar
// (previous, play/pause, next tutorial, volume, speed, full screen).
// Uses the official YouTube IFrame Player API.

let apiPromise = null;

function loadYouTubeApi() {
    if (window.YT && window.YT.Player) return Promise.resolve(window.YT);
    if (!apiPromise) {
        apiPromise = new Promise((resolve, reject) => {
            const previous = window.onYouTubeIframeAPIReady;
            window.onYouTubeIframeAPIReady = () => {
                if (typeof previous === "function") previous();
                resolve(window.YT);
            };
            const script = document.createElement("script");
            script.src = "https://www.youtube.com/iframe_api";
            script.onerror = () => reject(new Error("Could not load the YouTube player."));
            document.head.append(script);
        });
    }
    return apiPromise;
}

const ICONS = {
    prev: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6h2v12H6zm3.5 6 8.5 6V6z"/></svg>',
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 19h4V5H6zm8-14v14h4V5z"/></svg>',
    next: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 18 8.5-6L6 6zM16 6v12h2V6z"/></svg>',
    volume: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9v6h4l5 5V4L7 9zm13.5 3A4.5 4.5 0 0 0 14 8v8a4.47 4.47 0 0 0 2.5-4zM14 3.23v2.06a7 7 0 0 1 0 13.42v2.06A9 9 0 0 0 14 3.23z"/></svg>',
    muted: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M16.5 12A4.5 4.5 0 0 0 14 8v2.18l2.45 2.45c.03-.2.05-.41.05-.63zM19 12c0 .94-.2 1.82-.54 2.64l1.51 1.51A8.8 8.8 0 0 0 21 12a9 9 0 0 0-7-8.77v2.06A7 7 0 0 1 19 12zM4.27 3 3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06a9 9 0 0 0 3.69-1.81L19.73 21 21 19.73l-9-9zM12 4 9.91 6.09 12 8.18z"/></svg>',
    fullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 14H5v5h5v-2H7zm-2-4h2V7h3V5H5zm12 7h-3v2h5v-5h-2zM14 5v2h3v3h2V5z"/></svg>',
    exitFullscreen: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 16h3v3h2v-5H5zm3-8H5v2h5V5H8zm6 11h2v-3h3v-2h-5zm2-11V5h-2v5h5V8z"/></svg>'
};

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];

/**
 * Creates a player inside `root` for a YouTube playlist.
 * Returns { loadPlaylist(playlistId) } to switch to another playlist.
 */
export function createCoursePlayer(root, { playlistId, label = "Course video player" }) {
    root.classList.add("course-player");
    root.setAttribute("role", "region");
    root.setAttribute("aria-label", label);
    root.innerHTML = `
        <div class="cp-screen"><div class="cp-video"></div></div>
        <div class="cp-now" aria-live="polite">
            <span class="cp-count">Loading tutorials…</span>
            <span class="cp-title"></span>
        </div>
        <div class="cp-controls">
            <div class="cp-group">
                <button type="button" class="cp-btn cp-prev" aria-label="Previous tutorial" title="Previous tutorial" disabled>${ICONS.prev}</button>
                <button type="button" class="cp-btn cp-play" aria-label="Play" title="Play" disabled>${ICONS.play}</button>
                <button type="button" class="cp-btn cp-next cp-next-wide" aria-label="Next tutorial" title="Next tutorial" disabled>
                    <span>Next tutorial</span>${ICONS.next}
                </button>
            </div>
            <div class="cp-group">
                <div class="cp-volume">
                    <button type="button" class="cp-btn cp-mute" aria-label="Mute" title="Mute" disabled>${ICONS.volume}</button>
                    <input type="range" class="cp-volume-range" min="0" max="100" step="5" value="100" aria-label="Volume" disabled>
                </div>
                <label class="cp-speed">
                    <span>Speed</span>
                    <select class="cp-speed-select" aria-label="Playback speed" disabled>
                        ${SPEEDS.map((s) => `<option value="${s}"${s === 1 ? " selected" : ""}>${s === 1 ? "Normal" : `${s}×`}</option>`).join("")}
                    </select>
                </label>
                <button type="button" class="cp-btn cp-fullscreen" aria-label="Full screen" title="Full screen">${ICONS.fullscreen}</button>
            </div>
        </div>`;

    const q = (selector) => root.querySelector(selector);
    const countEl = q(".cp-count");
    const titleEl = q(".cp-title");
    const prevBtn = q(".cp-prev");
    const playBtn = q(".cp-play");
    const nextBtn = q(".cp-next");
    const muteBtn = q(".cp-mute");
    const volumeRange = q(".cp-volume-range");
    const speedSelect = q(".cp-speed-select");
    const fullscreenBtn = q(".cp-fullscreen");
    const controls = [prevBtn, playBtn, nextBtn, muteBtn, volumeRange, speedSelect];

    let player = null;
    let ready = false;
    let speed = 1;

    function updateNowPlaying() {
        if (!ready) return;
        const list = player.getPlaylist() || [];
        const index = player.getPlaylistIndex();
        if (list.length && index >= 0) {
            countEl.textContent = `Tutorial ${index + 1} of ${list.length}`;
            prevBtn.disabled = index <= 0;
            nextBtn.disabled = index >= list.length - 1;
        }
        const data = player.getVideoData ? player.getVideoData() : null;
        titleEl.textContent = data && data.title ? data.title : "";
    }

    function updateVolumeUi() {
        const muted = player.isMuted() || player.getVolume() === 0;
        muteBtn.innerHTML = muted ? ICONS.muted : ICONS.volume;
        muteBtn.setAttribute("aria-label", muted ? "Unmute" : "Mute");
        muteBtn.title = muted ? "Unmute" : "Mute";
        volumeRange.value = muted ? 0 : player.getVolume();
    }

    function setPlayIcon(playing) {
        playBtn.innerHTML = playing ? ICONS.pause : ICONS.play;
        playBtn.setAttribute("aria-label", playing ? "Pause" : "Play");
        playBtn.title = playing ? "Pause" : "Play";
    }

    // Buttons
    prevBtn.addEventListener("click", () => ready && player.previousVideo());
    nextBtn.addEventListener("click", () => ready && player.nextVideo());
    playBtn.addEventListener("click", () => {
        if (!ready) return;
        if (player.getPlayerState() === window.YT.PlayerState.PLAYING) player.pauseVideo();
        else player.playVideo();
    });
    muteBtn.addEventListener("click", () => {
        if (!ready) return;
        if (player.isMuted() || player.getVolume() === 0) {
            player.unMute();
            if (player.getVolume() === 0) player.setVolume(50);
        } else {
            player.mute();
        }
        setTimeout(updateVolumeUi, 50);
    });
    volumeRange.addEventListener("input", () => {
        if (!ready) return;
        const value = Number(volumeRange.value);
        player.setVolume(value);
        if (value === 0) player.mute();
        else player.unMute();
        setTimeout(updateVolumeUi, 50);
    });
    speedSelect.addEventListener("change", () => {
        speed = Number(speedSelect.value);
        if (ready) player.setPlaybackRate(speed);
    });

    // Full screen on the whole player so our controls stay visible.
    const canFullscreen = Boolean(root.requestFullscreen || root.webkitRequestFullscreen);
    if (!canFullscreen) fullscreenBtn.hidden = true;
    const fullscreenElement = () => document.fullscreenElement || document.webkitFullscreenElement;
    fullscreenBtn.addEventListener("click", () => {
        if (fullscreenElement() === root) {
            (document.exitFullscreen || document.webkitExitFullscreen).call(document);
        } else {
            (root.requestFullscreen || root.webkitRequestFullscreen).call(root);
        }
    });
    const onFullscreenChange = () => {
        const active = fullscreenElement() === root;
        fullscreenBtn.innerHTML = active ? ICONS.exitFullscreen : ICONS.fullscreen;
        fullscreenBtn.setAttribute("aria-label", active ? "Exit full screen" : "Full screen");
        fullscreenBtn.title = active ? "Exit full screen" : "Full screen";
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);

    loadYouTubeApi().then((YT) => {
        player = new YT.Player(q(".cp-video"), {
            width: "100%",
            height: "100%",
            playerVars: {
                listType: "playlist",
                list: playlistId,
                rel: 0,
                fs: 0, // use our full-screen button so the control bar stays visible
                playsinline: 1,
                modestbranding: 1,
                origin: window.location.origin
            },
            events: {
                onReady: () => {
                    ready = true;
                    controls.forEach((el) => { el.disabled = false; });
                    const rates = player.getAvailablePlaybackRates ? player.getAvailablePlaybackRates() : SPEEDS;
                    [...speedSelect.options].forEach((option) => {
                        option.hidden = !rates.includes(Number(option.value));
                    });
                    updateVolumeUi();
                    updateNowPlaying();
                },
                onStateChange: (event) => {
                    setPlayIcon(event.data === YT.PlayerState.PLAYING || event.data === YT.PlayerState.BUFFERING);
                    // Keep the chosen speed when the next tutorial starts.
                    if (event.data === YT.PlayerState.PLAYING && player.getPlaybackRate() !== speed) {
                        player.setPlaybackRate(speed);
                    }
                    updateNowPlaying();
                },
                onPlaybackRateChange: (event) => {
                    speed = event.data;
                    speedSelect.value = String(event.data);
                },
                onError: () => {
                    titleEl.textContent = "This video could not be played. Try the next tutorial.";
                }
            }
        });
    }).catch(() => {
        countEl.textContent = "The video player could not be loaded. Please check your connection and refresh.";
    });

    return {
        loadPlaylist(newPlaylistId) {
            if (!ready) return;
            countEl.textContent = "Loading tutorials…";
            titleEl.textContent = "";
            player.cuePlaylist({ listType: "playlist", list: newPlaylistId, index: 0 });
        }
    };
}
