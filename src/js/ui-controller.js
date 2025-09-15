// UI Controller for handling user interactions
export class UIController {
    constructor(cameraManager) {
        this.cameraManager = cameraManager;
        this.timerID = null;
        this.counter = 0;
        this.transparentColor = "transparent";
    }

    initialize() {
        this.setupEventListeners();
        this.setupFilters();
        this.setupKeyboardShortcuts();
        this.setupControlHandlers();
    }

    setupEventListeners() {
        // Capture button
        const captureBtnCont = document.querySelector(".capture-btn-cont");
        const captureBtn = document.querySelector(".capture-btn");
        
        if (captureBtnCont) {
            captureBtnCont.addEventListener("click", (e) => {
                captureBtn.classList.add("scale-capture");
                this.cameraManager.capturePhoto();
                
                setTimeout(() => {
                    captureBtn.classList.remove("scale-capture");
                }, 500);
            });
        }

        // Record button
        const recordBtnCont = document.querySelector(".record-btn-cont");
        const recordBtn = document.querySelector(".record-btn");
        
        if (recordBtnCont) {
            recordBtnCont.addEventListener("click", async (e) => {
                this.cameraManager.recordFlag = !this.cameraManager.recordFlag;

                if (this.cameraManager.recordFlag) {
                    await this.cameraManager.startRecording();
                    recordBtn.classList.add("scale-record");
                    this.startTimer();
                } else {
                    this.cameraManager.stopRecording();
                    recordBtn.classList.remove("scale-record");
                    this.stopTimer();
                    this.cameraManager.showSuccess("Video recorded successfully!");
                }
            });
        }

        // Gallery button
        const gallery = document.querySelector(".gallery");
        if (gallery) {
            gallery.addEventListener("click", (e) => {
                window.location.assign("./gallery.html");
            });
        }

        // Settings panel
        const settingsBtn = document.getElementById('settingsBtn');
        const controlsPanel = document.getElementById('controlsPanel');
        const closeControls = document.getElementById('closeControls');
        
        if (settingsBtn && controlsPanel) {
            settingsBtn.addEventListener('click', () => {
                controlsPanel.classList.add('active');
            });
        }
        
        if (closeControls && controlsPanel) {
            closeControls.addEventListener('click', () => {
                controlsPanel.classList.remove('active');
            });
            
            controlsPanel.addEventListener('click', (e) => {
                if (e.target === controlsPanel) {
                    controlsPanel.classList.remove('active');
                }
            });
        }
    }

    setupControlHandlers() {
        const cameraSelect = document.getElementById('cameraSelect');
        const micSelect = document.getElementById('micSelect');
        const resolutionSelect = document.getElementById('resolutionSelect');
        const modeButtons = document.querySelectorAll('.mode-btn');
        
        if (cameraSelect) {
            cameraSelect.addEventListener('change', async () => {
                if (cameraSelect.value) {
                    await this.cameraManager.switchCamera(cameraSelect.value);
                }
            });
        }
        
        if (micSelect) {
            micSelect.addEventListener('change', async () => {
                if (micSelect.value) {
                    await this.cameraManager.switchMicrophone(micSelect.value);
                }
            });
        }
        
        if (resolutionSelect) {
            resolutionSelect.addEventListener('change', async () => {
                await this.cameraManager.changeResolution(resolutionSelect.value);
            });
        }
        
        modeButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                modeButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.cameraManager.setMode(btn.dataset.mode);
                this.cameraManager.showSuccess(`Switched to ${btn.textContent} mode`);
            });
        });
    }

    setupFilters() {
        const filterLayer = document.querySelector(".filter-layer");
        const allFilters = document.querySelectorAll(".filter");

        allFilters.forEach((filterElem) => {
            filterElem.addEventListener("click", (e) => {
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
                
                // Apply filter and update global variable
                this.transparentColor = filterColor;
                if (filterLayer) {
                    filterLayer.style.backgroundColor = filterColor;
                    filterLayer.style.transition = 'background-color 0.3s ease';
                }
                
                // Show feedback
                const filterName = filterElem.title || 'Filter';
                this.cameraManager.showSuccess(`${filterName} applied`);
            });
        });
    }

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Don't trigger shortcuts when typing in inputs
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
            
            if (e.code === 'Space') {
                e.preventDefault();
                document.querySelector('.capture-btn-cont')?.click();
            } else if (e.code === 'KeyR') {
                e.preventDefault();
                document.querySelector('.record-btn-cont')?.click();
            } else if (e.code === 'KeyG') {
                e.preventDefault();
                document.querySelector('.gallery')?.click();
            } else if (e.code === 'KeyS') {
                e.preventDefault();
                document.getElementById('settingsBtn')?.click();
            } else if (e.code === 'Escape') {
                e.preventDefault();
                document.getElementById('controlsPanel')?.classList.remove('active');
            }
        });
    }

    startTimer() {
        const timer = document.querySelector(".timer");
        if (!timer) return;
        
        timer.style.display = "block";
        this.counter = 0;
        
        const displayTimer = () => {
            let totalSeconds = this.counter;

            let hours = Math.floor(totalSeconds / 3600);
            totalSeconds = totalSeconds % 3600;

            let minutes = Math.floor(totalSeconds / 60);
            totalSeconds = totalSeconds % 60;

            let seconds = totalSeconds;

            hours = hours < 10 ? `0${hours}` : hours;
            minutes = minutes < 10 ? `0${minutes}` : minutes;
            seconds = seconds < 10 ? `0${seconds}` : seconds;

            timer.innerText = `${hours}:${minutes}:${seconds}`;
            this.counter++;
        };

        this.timerID = setInterval(displayTimer, 1000);
    }

    stopTimer() {
        const timer = document.querySelector(".timer");
        if (!timer) return;
        
        clearInterval(this.timerID);
        timer.innerText = "00:00:00";
        timer.style.display = "none";
        this.counter = 0;
    }
}
