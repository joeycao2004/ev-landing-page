// Get video element
const video = document.getElementById('evVideo');

// Initial state
let clickCount = 0;
let idleTimeout;
let isSleeping = false;

// Helper to play a video and return a Promise when it ends
function playVideo(src, loop = false) {
  return new Promise((resolve) => {
    video.loop = loop;
    video.src = src;
    video.play();
    video.onended = () => {
      if (!loop) resolve();
    };
    if (loop) resolve(); // if looping, don't wait
  });
}

// Set Idle Loop
function playIdle() {
  isSleeping = false;
  playVideo('videos/Idle.mp4', true);
}

// Set Sleep Loop
function playSleepLoop() {
  isSleeping = true;
  playVideo('videos/Sleep-loop.mp4', true);
}

// Reset idle timer
function resetIdleTimer() {
  clearTimeout(idleTimeout);
  if (!isSleeping) {
    idleTimeout = setTimeout(async () => {
      await playVideo('videos/Sleep-start.mp4');
      playSleepLoop();
    }, 10000); // 10 seconds
  }
}

// Handle interaction
function handleInteraction() {
  if (isSleeping) {
    isSleeping = false;
    playVideo('videos/Sleep-wake.mp4').then(playIdle);
    return;
  }

  clickCount++;
  if (clickCount === 1 || clickCount === 2) {
    playVideo('videos/Roar.mp4').then(playIdle);
  } else {
    playVideo('videos/Rage.mp4').then(playIdle);
  }

  clickCount = 0;
}

// Long press handler
let pressTimer;
function handleLongPressStart() {
  pressTimer = setTimeout(() => {
    clickCount = 0;
    playVideo('videos/Nuzzle.mp4').then(playIdle);
  }, 1000); // 1 second
}
function handleLongPressEnd() {
  clearTimeout(pressTimer);
}

// Set up click region
document.addEventListener('DOMContentLoaded', () => {
  playIdle();
  resetIdleTimer();

  const clickbox = document.getElementById('clickbox');

  clickbox.addEventListener('mousedown', handleLongPressStart);
  clickbox.addEventListener('mouseup', handleLongPressEnd);
  clickbox.addEventListener('click', () => {
    handleInteraction();
    resetIdleTimer();
  });
});
