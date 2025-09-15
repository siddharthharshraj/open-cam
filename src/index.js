// Import CSS files
import './styles/main.css';

// Import JavaScript modules
import { initializeDatabase } from './js/database';
import { CameraManager } from './js/camera';
import { UIController } from './js/ui-controller';

// Initialize the application
class App {
    constructor() {
        this.cameraManager = null;
        this.uiController = null;
        this.db = null;
    }

    async init() {
        try {
            // Initialize database
            this.db = await initializeDatabase();
            
            // Initialize camera manager
            this.cameraManager = new CameraManager(this.db);
            
            // Initialize UI controller
            this.uiController = new UIController(this.cameraManager);
            
            // Start the application
            await this.cameraManager.initialize();
            this.uiController.initialize();
            
            console.log('ProCam Studio initialized successfully');
        } catch (error) {
            console.error('Failed to initialize ProCam Studio:', error);
            this.showError('Failed to initialize camera application');
        }
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: #ef4444;
            color: white;
            padding: 1rem 2rem;
            border-radius: 10px;
            z-index: 1000;
            font-weight: 500;
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 3000);
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new App();
    app.init();
});

// Export for global access if needed
window.ProCamApp = App;
