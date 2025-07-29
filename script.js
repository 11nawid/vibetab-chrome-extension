// script.js - Complete implementation with Cross-Tab Timer
document.addEventListener('DOMContentLoaded', () => {
  // Initialize all components
  initClock();
  initCrossTabTimer();
  initPageLoad();
  initVideoBackground();
  initSearchFocus();
});

// 1. Clock Functionality
function initClock() {
  function updateClock() {
    const now = new Date();
    
    // Time in 12-hour format with AM/PM
    let hours = now.getHours();
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12; // Convert 0 to 12
    const minutes = now.getMinutes().toString().padStart(2, '0');
    
    // Date formatting
    const options = { weekday: 'long', month: 'long', day: 'numeric' };
    const dateString = now.toLocaleDateString('en-US', options);
    
    // Update the DOM
    document.getElementById('time').textContent = `${hours}:${minutes} ${ampm}`;
    document.getElementById('date').textContent = dateString;
  }

  // Update immediately and then every minute
  updateClock();
  setInterval(updateClock, 60000);
}

// 2. Cross-Tab Timer Functionality
function initCrossTabTimer() {
  const timerDisplay = document.getElementById('timer-display');
  const startBtn = document.getElementById('timer-start');
  const resetBtn = document.getElementById('timer-reset');
  const progressBar = document.getElementById('timer-progress');
  
  const POMODORO_TIME = 25 * 60; // 25 minutes in seconds
  let timerInterval;
  let endTime = 0;
  let isRunning = false;

  // Load timer state from localStorage
  loadTimerState();

  // Set up BroadcastChannel for cross-tab communication
  const timerChannel = new BroadcastChannel('vibetab_timer');
  
  timerChannel.onmessage = (e) => {
    if (e.data.type === 'SYNC') {
      syncTimer(e.data);
    } else if (e.data.type === 'NOTIFICATION') {
      showTimerNotification(e.data.message);
    }
  };

  // Button event listeners
  startBtn.addEventListener('click', toggleTimer);
  resetBtn.addEventListener('click', resetTimer);

  // Update timer display every second
  setInterval(updateTimerDisplay, 1000);

  function toggleTimer() {
    if (isRunning) {
      pauseTimer();
    } else {
      startTimer();
    }
    broadcastTimerState();
  }

  function startTimer() {
    if (!isRunning) {
      const now = Date.now();
      // If timer was paused, adjust endTime by the pause duration
      if (endTime > now) {
        endTime = now + (endTime - now);
      } else {
        endTime = now + POMODORO_TIME * 1000;
      }
      
      isRunning = true;
      startBtn.textContent = 'Pause';
      saveTimerState();
    }
  }

  function pauseTimer() {
    isRunning = false;
    startBtn.textContent = 'Start';
    saveTimerState();
  }

  function resetTimer() {
    isRunning = false;
    endTime = 0;
    startBtn.textContent = 'Start';
    updateTimerDisplay();
    saveTimerState();
    broadcastTimerState();
  }

  function updateTimerDisplay() {
    const now = Date.now();
    let remaining = isRunning ? Math.max(0, Math.floor((endTime - now) / 1000)) : 
                  (endTime > now ? Math.floor((endTime - now) / 1000) : POMODORO_TIME);

    // Update progress bar
    const progress = 100 - (remaining / POMODORO_TIME * 100);
    progressBar.style.width = `${progress}%`;

    // Update time display
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    timerDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;

    // Timer completed
    if (isRunning && remaining <= 0) {
      timerCompleted();
    }
  }

  function timerCompleted() {
    isRunning = false;
    startBtn.textContent = 'Start';
    saveTimerState();
    broadcastTimerState();
    
    // Show notification
    const notification = {
      type: 'NOTIFICATION',
      message: 'Timer completed!'
    };
    timerChannel.postMessage(notification);
    
    // Play sound if in the active tab
    if (document.visibilityState === 'visible') {
      playCompletionSound();
    }
  }

  function playCompletionSound() {
    // Create a simple notification sound using the Web Audio API
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      
      oscillator.type = 'sine';
      oscillator.frequency.value = 880;
      gainNode.gain.value = 0.5;
      
      oscillator.start();
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 1);
      oscillator.stop(audioCtx.currentTime + 1);
    } catch (e) {
      console.log('Audio playback error:', e);
    }
  }

  function syncTimer(data) {
    endTime = data.endTime;
    isRunning = data.isRunning;
    
    if (isRunning) {
      startBtn.textContent = 'Pause';
    } else {
      startBtn.textContent = 'Start';
    }
    
    updateTimerDisplay();
  }

  function broadcastTimerState() {
    const message = {
      type: 'SYNC',
      endTime: endTime,
      isRunning: isRunning
    };
    timerChannel.postMessage(message);
  }

  function showTimerNotification(message) {
    if (document.visibilityState === 'visible') {
      // Only show notification if tab is active
      playCompletionSound();
    }
  }

  function saveTimerState() {
    localStorage.setItem('pomodoroTimer', JSON.stringify({
      endTime: endTime,
      isRunning: isRunning
    }));
  }

  function loadTimerState() {
    const savedState = JSON.parse(localStorage.getItem('pomodoroTimer'));
    if (savedState) {
      endTime = savedState.endTime;
      isRunning = savedState.isRunning;
      
      if (isRunning) {
        startBtn.textContent = 'Pause';
      }
      
      updateTimerDisplay();
    }
  }
}

// 3. Page Load Effects
function initPageLoad() {
  document.body.style.opacity = '0';
  setTimeout(() => {
    document.body.style.transition = 'opacity 0.5s ease-out';
    document.body.style.opacity = '1';
  }, 10);
}

// 4. Video Background Handling
function initVideoBackground() {
  const video = document.getElementById('bg-video');
  video.play().catch(e => {
    console.log("Autoplay prevented, showing fallback content");
    video.muted = true;
    video.play();
  });
}

// 5. Search Functionality
function initSearchFocus() {
  const searchInput = document.querySelector('.search-input');
  
  // Focus on search bar on page load
  searchInput.focus();
  
  // Save search history
  searchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && searchInput.value.trim()) {
      saveSearchQuery(searchInput.value.trim());
    }
  });
  
  // Load last search if available
  const lastSearch = getLastSearch();
  if (lastSearch) {
    searchInput.value = lastSearch;
  }
  
  function saveSearchQuery(query) {
    const searches = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    searches.unshift(query);
    localStorage.setItem('searchHistory', JSON.stringify(searches.slice(0, 10)));
    localStorage.setItem('lastSearch', query);
  }
  
  function getLastSearch() {
    return localStorage.getItem('lastSearch');
  }
}