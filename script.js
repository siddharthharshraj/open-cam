let video = document.querySelector("video");
let recordBtnCont = document.querySelector(".record-btn-cont");
let recordBtn = document.querySelector(".record-btn");
let captureBtnCont = document.querySelector(".capture-btn-cont");
let captureBtn = document.querySelector(".capture-btn");
let recordFlag = false;
let transparentColor = "transparent";
let currentStream = null;
let screenStream = null;
let currentMode = 'camera';
let availableDevices = { cameras: [], microphones: [] };

let recorder;
let chunks = []; // Media data in chunks

let constraints = {
  video: {
    width: { ideal: 1280 },
    height: { ideal: 720 },
    facingMode: 'user'
  },
  audio: true,
};

// Initialize camera with error handling
async function initializeCamera() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    currentStream = stream;
    video.srcObject = stream;
    
    // Add loading state removal
    video.addEventListener('loadedmetadata', () => {
      document.body.classList.add('camera-ready');
    });

    recorder = new MediaRecorder(stream);
    recorder.addEventListener("start", (e) => {
      chunks = [];
      recordBtn.classList.add('recording');
    });
    recorder.addEventListener("dataavailable", (e) => {
      chunks.push(e.data);
    });
    recorder.addEventListener("stop", (e) => {
      recordBtn.classList.remove('recording');
      // Conversion of media chunks data to video
      let blob = new Blob(chunks, { type: "video/mp4" });

      if (db) {
        let videoID = shortid();
        let dbTransaction = db.transaction("video", "readwrite");
        let videoStore = dbTransaction.objectStore("video");
        let videoEntry = {
          id: `vid-${videoID}`,
          blobData: blob,
        };
        videoStore.add(videoEntry);
      }
    });
  } catch (error) {
    console.error('Error accessing camera:', error);
    showError('Camera access denied or not available');
  }
}

// Error handling function
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: var(--danger-color);
    color: white;
    padding: 1rem 2rem;
    border-radius: 10px;
    z-index: 1000;
    font-weight: 500;
  `;
  document.body.appendChild(errorDiv);
  setTimeout(() => errorDiv.remove(), 3000);
}

// Initialize camera and enumerate devices on load
initializeApp();

async function initializeApp() {
  await enumerateDevices();
  await initializeCamera();
  setupControlHandlers();
}

// Enumerate available devices
async function enumerateDevices() {
  try {
    const devices = await navigator.mediaDevices.enumerateDevices();
    
    availableDevices.cameras = devices.filter(device => device.kind === 'videoinput');
    availableDevices.microphones = devices.filter(device => device.kind === 'audioinput');
    
    populateDeviceSelectors();
  } catch (error) {
    console.error('Error enumerating devices:', error);
    showError('Unable to access media devices');
  }
}

// Populate device selector dropdowns
function populateDeviceSelectors() {
  const cameraSelect = document.getElementById('cameraSelect');
  const micSelect = document.getElementById('micSelect');
  
  // Populate camera selector
  cameraSelect.innerHTML = '';
  if (availableDevices.cameras.length === 0) {
    cameraSelect.innerHTML = '<option value="">No cameras found</option>';
  } else {
    availableDevices.cameras.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Camera ${index + 1}`;
      if (index === 0) option.selected = true;
      cameraSelect.appendChild(option);
    });
  }
  
  // Populate microphone selector
  micSelect.innerHTML = '';
  if (availableDevices.microphones.length === 0) {
    micSelect.innerHTML = '<option value="">No microphones found</option>';
  } else {
    availableDevices.microphones.forEach((device, index) => {
      const option = document.createElement('option');
      option.value = device.deviceId;
      option.textContent = device.label || `Microphone ${index + 1}`;
      if (index === 0) option.selected = true;
      micSelect.appendChild(option);
    });
  }
}

// Setup control panel handlers
function setupControlHandlers() {
  const cameraSelect = document.getElementById('cameraSelect');
  const micSelect = document.getElementById('micSelect');
  const resolutionSelect = document.getElementById('resolutionSelect');
  const modeButtons = document.querySelectorAll('.mode-btn');
  
  // Camera selection change
  cameraSelect.addEventListener('change', async () => {
    if (cameraSelect.value) {
      constraints.video.deviceId = { exact: cameraSelect.value };
      await reinitializeCamera();
    }
  });
  
  // Microphone selection change
  micSelect.addEventListener('change', async () => {
    if (micSelect.value) {
      constraints.audio = { deviceId: { exact: micSelect.value } };
      await reinitializeCamera();
    }
  });
  
  // Resolution change
  resolutionSelect.addEventListener('change', async () => {
    const [width, height] = resolutionSelect.value.split('x').map(Number);
    constraints.video.width = { ideal: width };
    constraints.video.height = { ideal: height };
    await reinitializeCamera();
  });
  
  // Mode selection
  modeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      modeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentMode = btn.dataset.mode;
      showSuccess(`Switched to ${btn.textContent} mode`);
    });
  });
}

// Reinitialize camera with new constraints
async function reinitializeCamera() {
  try {
    if (currentStream) {
      currentStream.getTracks().forEach(track => track.stop());
    }
    await initializeCamera();
    showSuccess('Camera settings updated');
  } catch (error) {
    console.error('Error reinitializing camera:', error);
    showError('Failed to update camera settings');
  }
}

recordBtnCont.addEventListener("click", async (e) => {
  if (!recorder) return;

  recordFlag = !recordFlag;

  if (recordFlag) {
    // start recording based on current mode
    await startRecording();
    recordBtn.classList.add("scale-record");
    startTimer();
  } else {
    // stop recording
    recorder.stop();
    if (screenStream) {
      screenStream.getTracks().forEach(track => track.stop());
      screenStream = null;
    }
    recordBtn.classList.remove("scale-record");
    stopTimer();
    showSuccess("Video recorded successfully!");
  }
});

// Start recording based on current mode
async function startRecording() {
  try {
    let recordingStream;
    
    switch (currentMode) {
      case 'camera':
        recordingStream = currentStream;
        break;
        
      case 'screen':
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: 'screen' },
          audio: true
        });
        recordingStream = screenStream;
        break;
        
      case 'both':
        // Get screen stream
        screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: { mediaSource: 'screen' },
          audio: true
        });
        
        // Create combined stream (this is a simplified version)
        // In a real implementation, you'd use canvas to composite both streams
        recordingStream = screenStream;
        showSuccess('Recording screen (camera overlay not implemented in this demo)');
        break;
        
      default:
        recordingStream = currentStream;
    }
    
    // Create new recorder with the appropriate stream
    recorder = new MediaRecorder(recordingStream);
    
    recorder.addEventListener("start", (e) => {
      chunks = [];
      recordBtn.classList.add('recording');
    });
    
    recorder.addEventListener("dataavailable", (e) => {
      chunks.push(e.data);
    });
    
    recorder.addEventListener("stop", (e) => {
      recordBtn.classList.remove('recording');
      let blob = new Blob(chunks, { type: "video/mp4" });

      if (db) {
        let videoID = shortid();
        let dbTransaction = db.transaction("video", "readwrite");
        let videoStore = dbTransaction.objectStore("video");
        let videoEntry = {
          id: `vid-${videoID}`,
          blobData: blob,
        };
        videoStore.add(videoEntry);
      }
    });
    
    recorder.start();
    
  } catch (error) {
    console.error('Error starting recording:', error);
    showError('Failed to start recording. Screen sharing may not be supported.');
    recordFlag = false;
  }
}

captureBtnCont.addEventListener("click", (e) => {
  captureBtn.classList.add("scale-capture");

  let canvas = document.createElement("canvas");
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  let tool = canvas.getContext("2d");
  tool.drawImage(video, 0, 0, canvas.width, canvas.height);
  // Filtering
  tool.fillStyle = transparentColor;
  tool.fillRect(0, 0, canvas.width, canvas.height);

  let imageURL = canvas.toDataURL();

  if (db) {
    let imageID = shortid();
    let dbTransaction = db.transaction("image", "readwrite");
    let imageStore = dbTransaction.objectStore("image");
    let imageEntry = {
      id: `img-${imageID}`,
      url: imageURL,
    };
    imageStore.add(imageEntry);
    showSuccess("Photo captured successfully!");
  }

  setTimeout(() => {
    captureBtn.classList.remove("scale-capture");
  }, 500);
});

let timerID;
let counter = 0; // Represents total seconds
let timer = document.querySelector(".timer");
function startTimer() {
  timer.style.display = "block";
  function displayTimer() {
    let totalSeconds = counter;

    let hours = Number.parseInt(totalSeconds / 3600);
    totalSeconds = totalSeconds % 3600; // remaining value

    let minutes = Number.parseInt(totalSeconds / 60);
    totalSeconds = totalSeconds % 60; // remaining value

    let seconds = totalSeconds;

    hours = hours < 10 ? `0${hours}` : hours;
    minutes = minutes < 10 ? `0${minutes}` : minutes;
    seconds = seconds < 10 ? `0${seconds}` : seconds;

    timer.innerText = `${hours}:${minutes}:${seconds}`;

    counter++;
  }

  timerID = setInterval(displayTimer, 1000);
}
function stopTimer() {
  clearInterval(timerID);
  timer.innerText = "00:00:00";
  timer.style.display = "none";
}

// Footer toggle functionality (legacy code - footer is now always visible)
const footerToggleElement = document.querySelector(".footer-toggle");
const footerElement = document.querySelector(".footer");
const actionContElement = document.querySelector(".action-cont");

if (footerToggleElement) {
    footerToggleElement.addEventListener("click", (e) => {
        footerElement.classList.toggle('show');
        actionContElement.classList.toggle('footer-active');
        const icon = footerToggleElement.querySelector('i');
        if (footerElement.classList.contains('show')) {
            icon.style.transform = 'rotate(180deg)';
        } else {
            icon.style.transform = 'rotate(0deg)';
        }
    });
}

// Initialize filters after DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  // Enhanced filtering logic with active states
  let filterLayer = document.querySelector(".filter-layer");
  let allFilters = document.querySelectorAll(".filter");

  console.log('Filter elements found:', allFilters.length);
  console.log('Filter layer found:', filterLayer);

  allFilters.forEach((filterElem) => {
    filterElem.addEventListener("click", (e) => {
      console.log('Filter clicked:', filterElem.className);
      
      // Remove active class from all filters
      allFilters.forEach(f => f.classList.remove('active'));
      // Add active class to clicked filter
      filterElem.classList.add('active');
      
      // Get filter color based on class name
      let filterColor = 'transparent';
      if (filterElem.classList.contains('orange')) {
        filterColor = 'rgba(255, 165, 0, 0.4)';
      } else if (filterElem.classList.contains('brown')) {
        filterColor = 'rgba(165, 42, 42, 0.4)';
      } else if (filterElem.classList.contains('pink')) {
        filterColor = 'rgba(255, 192, 203, 0.4)';
      } else if (filterElem.classList.contains('transparent')) {
        filterColor = 'transparent';
      }
      
      console.log('Applying filter color:', filterColor);
      
      // Apply filter and update global variable
      transparentColor = filterColor;
      if (filterLayer) {
        filterLayer.style.backgroundColor = filterColor;
        filterLayer.style.transition = 'background-color 0.3s ease';
      }
      
      // Show feedback
      const filterName = filterElem.title || 'Filter';
      showSuccess(`${filterName} applied`);
    });
  });
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Don't trigger shortcuts when typing in inputs
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
  
  if (e.code === 'Space') {
    e.preventDefault();
    captureBtnCont.click();
  } else if (e.code === 'KeyR') {
    e.preventDefault();
    recordBtnCont.click();
  } else if (e.code === 'KeyG') {
    e.preventDefault();
    document.querySelector('.gallery').click();
  } else if (e.code === 'KeyS') {
    e.preventDefault();
    document.getElementById('settingsBtn').click();
  } else if (e.code === 'Escape') {
    e.preventDefault();
    document.getElementById('controlsPanel').classList.remove('active');
  }
});

// Add success notification for captures
function showSuccess(message) {
  const successDiv = document.createElement('div');
  successDiv.className = 'success-message';
  successDiv.textContent = message;
  successDiv.style.cssText = `
    position: fixed;
    top: 2rem;
    right: 2rem;
    background: #10b981;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    z-index: 1000;
    font-weight: 500;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  document.body.appendChild(successDiv);
  
  // Slide in
  setTimeout(() => {
    successDiv.style.transform = 'translateX(0)';
  }, 100);
  
  // Slide out and remove
  setTimeout(() => {
    successDiv.style.transform = 'translateX(100%)';
    setTimeout(() => successDiv.remove(), 300);
  }, 2000);
}

// Add error notification
function showError(message) {
  const errorDiv = document.createElement('div');
  errorDiv.className = 'error-message';
  errorDiv.textContent = message;
  errorDiv.style.cssText = `
    position: fixed;
    top: 2rem;
    right: 2rem;
    background: #ef4444;
    color: white;
    padding: 0.75rem 1.5rem;
    border-radius: 10px;
    z-index: 1000;
    font-weight: 500;
    transform: translateX(100%);
    transition: transform 0.3s ease;
  `;
  document.body.appendChild(errorDiv);
  
  // Slide in
  setTimeout(() => {
    errorDiv.style.transform = 'translateX(0)';
  }, 100);
  
  // Slide out and remove
  setTimeout(() => {
    errorDiv.style.transform = 'translateX(100%)';
    setTimeout(() => errorDiv.remove(), 300);
  }, 2000);
}

// Handle screen share ended
function handleScreenShareEnded() {
  if (recordFlag && currentMode !== 'camera') {
    recordBtnCont.click(); // Stop recording
    showError('Screen sharing ended. Recording stopped.');
  }
}

// Add device change listener
navigator.mediaDevices.addEventListener('devicechange', async () => {
  console.log('Media devices changed');
  await enumerateDevices();
});
