let isLocked = false;
let isSleeping = false;
let clickCount = 0;
let clickTimer = null;
let idleTimeout = null;
let pressTimer = null;

const video = document.getElementById('evVideo');
const freezeCanvas = document.getElementById('videoFreezeFrame');
const freezeCtx = freezeCanvas.getContext('2d');

// === Utility: Freeze current video frame to canvas ===
function captureFreezeFrame() {
  freezeCanvas.width = video.videoWidth;
  freezeCanvas.height = video.videoHeight;
  freezeCtx.drawImage(video, 0, 0, freezeCanvas.width, freezeCanvas.height);
  freezeCanvas.style.display = 'block';
}

// === Utility: Clear canvas after new video begins
function clearFreezeFrame() {
  freezeCanvas.style.display = 'none';
}

// === Play video with optional freeze-frame logic ===
function playVideo(src, loop = false, lockDuringPlay = true) {
  return new Promise((resolve) => {
    if (!video) return;

    if (lockDuringPlay) isLocked = true;

    video.pause();
    captureFreezeFrame(); // Capture last frame before switch
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

function resetIdleTimer() {
  clearTimeout(idleTimeout);
  if (!isSleeping) {
    idleTimeout = setTimeout(async () => {
      isLocked = true;
      await playVideo('videos/Sleep-start.mp4', false);
      isSleeping = true;
      await playVideo('videos/Sleep-loop.mp4', true);
    }, 10000);
  }
}

function wakeUp() {
  if (isSleeping) {
    isSleeping = false;
    isLocked = true;
    playVideo('videos/Sleep-wake.mp4', false).then(() => {
      playIdle();
    });
  }
}

function playIdle() {
  isSleeping = false;
  isLocked = false;
  playVideo('videos/Idle.mp4', true, false);
  resetIdleTimer();
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
      console.log(`✅ Loaded: ${src}`);
      if (loaded + errored === sources.length) {
        console.log("✅ All preloading done");
        callback();
      }
    };

    v.onerror = () => {
      errored++;
      console.error(`❌ Failed to preload: ${src}`);
      if (loaded + errored === sources.length) {
        callback();
      }
    };
  });

  setTimeout(() => {
    console.warn("⚠️ Preload timeout reached. Continuing...");
    callback();
  }, 10000);
}

document.addEventListener('DOMContentLoaded', () => {
  const clickbox = document.getElementById('clickbox');
  const loadingScreen = document.getElementById('loadingScreen');

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
    if (isSleeping) {
      wakeUp();
    } else {
      registerClick();
    }
    resetIdleTimer();
  });
});
