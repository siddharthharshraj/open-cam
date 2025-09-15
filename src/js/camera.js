// Camera management and media recording
import { DatabaseManager } from './database';

export class CameraManager {
    constructor(db) {
        this.db = db;
        this.databaseManager = new DatabaseManager(db);
        this.video = null;
        this.currentStream = null;
        this.screenStream = null;
        this.recorder = null;
        this.recordFlag = false;
        this.currentMode = 'camera';
        this.chunks = [];
        this.availableDevices = { cameras: [], microphones: [] };
        
        this.constraints = {
            video: {
                width: { ideal: 1280 },
                height: { ideal: 720 },
                facingMode: 'user'
            },
            audio: true,
        };
    }

    async initialize() {
        this.video = document.querySelector("video");
        await this.enumerateDevices();
        await this.initializeCamera();
        this.setupRecorder();
    }

    async enumerateDevices() {
        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            this.availableDevices.cameras = devices.filter(device => device.kind === 'videoinput');
            this.availableDevices.microphones = devices.filter(device => device.kind === 'audioinput');
            
            this.populateDeviceSelectors();
        } catch (error) {
            console.error('Error enumerating devices:', error);
            this.showError('Unable to access media devices');
        }
    }

    populateDeviceSelectors() {
        const cameraSelect = document.getElementById('cameraSelect');
        const micSelect = document.getElementById('micSelect');
        
        if (cameraSelect) {
            cameraSelect.innerHTML = '';
            if (this.availableDevices.cameras.length === 0) {
                cameraSelect.innerHTML = '<option value="">No cameras found</option>';
            } else {
                this.availableDevices.cameras.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Camera ${index + 1}`;
                    if (index === 0) option.selected = true;
                    cameraSelect.appendChild(option);
                });
            }
        }
        
        if (micSelect) {
            micSelect.innerHTML = '';
            if (this.availableDevices.microphones.length === 0) {
                micSelect.innerHTML = '<option value="">No microphones found</option>';
            } else {
                this.availableDevices.microphones.forEach((device, index) => {
                    const option = document.createElement('option');
                    option.value = device.deviceId;
                    option.textContent = device.label || `Microphone ${index + 1}`;
                    if (index === 0) option.selected = true;
                    micSelect.appendChild(option);
                });
            }
        }
    }

    async initializeCamera() {
        try {
            const stream = await navigator.mediaDevices.getUserMedia(this.constraints);
            this.currentStream = stream;
            this.video.srcObject = stream;
            
            this.video.addEventListener('loadedmetadata', () => {
                document.body.classList.add('camera-ready');
            });

        } catch (error) {
            console.error('Error accessing camera:', error);
            this.showError('Camera access denied or not available');
        }
    }

    setupRecorder() {
        if (!this.currentStream) return;

        this.recorder = new MediaRecorder(this.currentStream);
        
        this.recorder.addEventListener("start", (e) => {
            this.chunks = [];
            const recordBtn = document.querySelector('.record-btn');
            if (recordBtn) recordBtn.classList.add('recording');
        });
        
        this.recorder.addEventListener("dataavailable", (e) => {
            this.chunks.push(e.data);
        });
        
        this.recorder.addEventListener("stop", (e) => {
            const recordBtn = document.querySelector('.record-btn');
            if (recordBtn) recordBtn.classList.remove('recording');
            
            const blob = new Blob(this.chunks, { type: "video/mp4" });
            this.databaseManager.saveVideo(blob);
        });
    }

    async startRecording() {
        try {
            let recordingStream;
            
            switch (this.currentMode) {
                case 'camera':
                    recordingStream = this.currentStream;
                    break;
                    
                case 'screen':
                    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: { mediaSource: 'screen' },
                        audio: true
                    });
                    recordingStream = this.screenStream;
                    break;
                    
                case 'both':
                    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
                        video: { mediaSource: 'screen' },
                        audio: true
                    });
                    recordingStream = this.screenStream;
                    this.showSuccess('Recording screen (camera overlay not implemented in this demo)');
                    break;
                    
                default:
                    recordingStream = this.currentStream;
            }
            
            this.recorder = new MediaRecorder(recordingStream);
            this.setupRecorder();
            this.recorder.start();
            
        } catch (error) {
            console.error('Error starting recording:', error);
            this.showError('Failed to start recording. Screen sharing may not be supported.');
            this.recordFlag = false;
        }
    }

    stopRecording() {
        if (this.recorder && this.recorder.state === 'recording') {
            this.recorder.stop();
        }
        if (this.screenStream) {
            this.screenStream.getTracks().forEach(track => track.stop());
            this.screenStream = null;
        }
    }

    capturePhoto() {
        const canvas = document.createElement("canvas");
        canvas.width = this.video.videoWidth;
        canvas.height = this.video.videoHeight;

        const tool = canvas.getContext("2d");
        tool.drawImage(this.video, 0, 0, canvas.width, canvas.height);
        
        // Apply current filter
        const filterLayer = document.querySelector(".filter-layer");
        if (filterLayer) {
            const filterColor = filterLayer.style.backgroundColor || 'transparent';
            tool.fillStyle = filterColor;
            tool.fillRect(0, 0, canvas.width, canvas.height);
        }

        const imageURL = canvas.toDataURL();
        this.databaseManager.saveImage(imageURL);
        this.showSuccess("Photo captured successfully!");
    }

    async switchCamera(deviceId) {
        if (deviceId) {
            this.constraints.video.deviceId = { exact: deviceId };
            await this.reinitializeCamera();
        }
    }

    async switchMicrophone(deviceId) {
        if (deviceId) {
            this.constraints.audio = { deviceId: { exact: deviceId } };
            await this.reinitializeCamera();
        }
    }

    async changeResolution(resolution) {
        const [width, height] = resolution.split('x').map(Number);
        this.constraints.video.width = { ideal: width };
        this.constraints.video.height = { ideal: height };
        await this.reinitializeCamera();
    }

    async reinitializeCamera() {
        try {
            if (this.currentStream) {
                this.currentStream.getTracks().forEach(track => track.stop());
            }
            await this.initializeCamera();
            this.setupRecorder();
            this.showSuccess('Camera settings updated');
        } catch (error) {
            console.error('Error reinitializing camera:', error);
            this.showError('Failed to update camera settings');
        }
    }

    setMode(mode) {
        this.currentMode = mode;
    }

    showSuccess(message) {
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
        
        setTimeout(() => {
            successDiv.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            successDiv.style.transform = 'translateX(100%)';
            setTimeout(() => successDiv.remove(), 300);
        }, 2000);
    }

    showError(message) {
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
        
        setTimeout(() => {
            errorDiv.style.transform = 'translateX(0)';
        }, 100);
        
        setTimeout(() => {
            errorDiv.style.transform = 'translateX(100%)';
            setTimeout(() => errorDiv.remove(), 300);
        }, 2000);
    }
}
