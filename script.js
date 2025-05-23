let isLocked = false;
let isSleeping = false;
let clickCount = 0;
let clickTimer = null;
let idleTimeout = null;
let pressTimer = null;
let messageShown = false;

const video = document.getElementById('evVideo');
const freezeCanvas = document.getElementById('videoFreezeFrame');
const freezeCtx = freezeCanvas.getContext('2d');
const loadingScreen = document.getElementById('loadingScreen');
const loadingMessage = document.getElementById('loadingMessage');

// === Utility: Freeze current video frame to canvas ===
function captureFreezeFrame() {
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  if (vw === 0 || vh === 0) return;

  freezeCanvas.width = video.offsetWidth;
  freezeCanvas.height = video.offsetHeight;

  freezeCanvas.style.width = video.offsetWidth + 'px';
  freezeCanvas.style.height = video.offsetHeight + 'px';

  freezeCtx.imageSmoothingEnabled = false; // prevent blur
  freezeCtx.drawImage(video, 0, 0, freezeCanvas.width, freezeCanvas.height);
  freezeCanvas.style.display = 'block';
}

function clearFreezeFrame() {
  freezeCanvas.style.display = 'none';
}

function showLoadingMessage() {
  if (!loadingScreen || !loadingMessage || messageShown) return;
  messageShown = true;

  loadingMessage.style.opacity = '1';

  setTimeout(() => {
    loadingMessage.style.opacity = '0';
    setTimeout(() => {
      messageShown = false;
    }, 500);
  }, 3000);
}

function playVideo(src, loop = false, lockDuringPlay = true) {
  return new Promise((resolve) => {
    if (!video) return;

    if (lockDuringPlay) isLocked = true;

    video.pause();
    captureFreezeFrame();
    video.src = src;
    video.loop = loop;

    const onStart = () => {
      clearFreezeFrame();
      video.removeEventListener('playing', onStart);
    };
    video.addEventListener('playing', onStart);

    const onEnd = () => {
      video.removeEventListener('ended', onEnd);
      if (!loop) {
        isLocked = false;
        resolve();
      }
    };

    if (!loop) {
      video.addEventListener('ended', onEnd);
    } else {
      isLocked = false;
      resolve();
    }

    video.play().catch((e) => {
      if (e.name !== 'AbortError') {
        console.warn('Playback failed:', e);
      }
    });
  });
}

// ✅ Modified: idle countdown only starts AFTER loop begins
function resetIdleTimer() {
  clearTimeout(idleTimeout);
  if (!isSleeping) {
    idleTimeout = setTimeout(async () => {
      isLocked = true;
      await playVideo('videos/Sleep-start.mp4', false);
      isSleeping = true;
      await playVideo('videos/Sleep-loop.mp4', true).then(() => {
        resetIdleTimer(); // restart 10s timer only after Sleep-loop begins
      });
    }, 10000);
  }
}

function wakeUp() {
  if (isSleeping) {
    isSleeping = false;
    isLocked = true;
    playVideo('videos/Sleep-wake.mp4', false).then(playIdle);
  }
}

function playIdle() {
  isSleeping = false;
  isLocked = false;
  playVideo('videos/Idle.mp4', true, false).then(() => {
    resetIdleTimer(); // ⏱ Restart countdown only after Idle is actually running
  });
}

function registerClick() {
  if (isLocked || isSleeping) return;

  clickCount++;
  clearTimeout(clickTimer);
  clickTimer = setTimeout(() => {
    if (clickCount > 2) {
      playVideo('videos/Rage.mp4').then(playIdle);
    } else {
      playVideo('videos/Roar.mp4').then(playIdle);
    }
    clickCount = 0;
  }, 500);
}

function handleLongPressStart() {
  if (isLocked || isSleeping) return;

  pressTimer = setTimeout(() => {
    isLocked = true;
    clickCount = 0;
    playVideo('videos/Nuzzle.mp4').then(playIdle);
  }, 500);
}

function handleLongPressEnd() {
  clearTimeout(pressTimer);
}

function preloadAllVideos(callback) {
  const sources = [
    'videos/Roar.mp4',
    'videos/Rage.mp4',
    'videos/Nuzzle.mp4',
    'videos/Sleep-start.mp4',
    'videos/Sleep-loop.mp4',
    'videos/Sleep-wake.mp4',
  ];

  let loaded = 0;
  let errored = 0;

  sources.forEach((src) => {
    const v = document.createElement('video');
    v.src = src;
    v.preload = 'auto';

    v.oncanplaythrough = () => {
      loaded++;
      if (loaded + errored === sources.length) callback();
    };

    v.onerror = () => {
      errored++;
      if (loaded + errored === sources.length) callback();
    };
  });

  setTimeout(() => {
    callback(); // fallback in case videos stall
  }, 10000);
}

document.addEventListener('DOMContentLoaded', () => {
  const clickbox = document.getElementById('clickbox');

  preloadAllVideos(() => {
    if (loadingScreen) {
      loadingScreen.style.opacity = '0';
      setTimeout(() => {
        loadingScreen.style.display = 'none';
      }, 500);
    }
    playIdle();
  });

  clickbox.addEventListener('mousedown', handleLongPressStart);
  clickbox.addEventListener('mouseup', handleLongPressEnd);

  clickbox.addEventListener('click', () => {
    if (loadingScreen.style.display !== 'none') {
      showLoadingMessage();
      return;
    }

    if (isSleeping) {
      wakeUp();
    } else {
      registerClick();
    }

    // 🚫 Removed resetIdleTimer() here — now controlled only in playIdle() and Sleep-loop
  });
});
