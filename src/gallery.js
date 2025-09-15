// Gallery page entry point
import './styles/main.css';
import './styles/gallery.css';

// Gallery functionality
class GalleryApp {
    constructor() {
        this.db = null;
    }

    async init() {
        try {
            await this.initGallery();
            this.setupBackButton();
        } catch (error) {
            console.error('Failed to initialize gallery:', error);
        }
    }

    initGallery() {
        return new Promise((resolve, reject) => {
            if (!window.indexedDB) {
                resolve();
                return;
            }
            
            const request = indexedDB.open("myDataBase", 1);
            
            request.onerror = () => resolve();
            
            request.onsuccess = (event) => {
                this.db = event.target.result;
                this.loadMediaFromDatabase();
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                this.db = event.target.result;
                
                if (!this.db.objectStoreNames.contains("video")) {
                    this.db.createObjectStore("video", { keyPath: "id" });
                }
                if (!this.db.objectStoreNames.contains("image")) {
                    this.db.createObjectStore("image", { keyPath: "id" });
                }
            };
        });
    }

    loadMediaFromDatabase() {
        const galleryCont = document.querySelector(".gallery-cont");
        if (!galleryCont) return;
        
        let totalMediaCount = 0;
        let completedStores = 0;
        
        const checkEmptyState = () => {
            completedStores++;
            if (completedStores === 2) {
                const emptyMsg = document.getElementById('emptyGalleryMessage');
                if (totalMediaCount === 0) {
                    if (emptyMsg) emptyMsg.style.display = 'flex';
                } else {
                    if (emptyMsg) emptyMsg.style.display = 'none';
                }
            }
        };
        
        // Load videos
        try {
            const videoTransaction = this.db.transaction("video", "readonly");
            const videoStore = videoTransaction.objectStore("video");
            const videoRequest = videoStore.getAll();
            
            videoRequest.onsuccess = (e) => {
                const videos = e.target.result;
                totalMediaCount += videos.length;
                
                videos.forEach((videoObj) => {
                    this.createMediaElement(videoObj, 'video', galleryCont);
                });
                
                checkEmptyState();
            };
            
            videoRequest.onerror = () => checkEmptyState();
        } catch (error) {
            checkEmptyState();
        }
        
        // Load images
        try {
            const imageTransaction = this.db.transaction("image", "readonly");
            const imageStore = imageTransaction.objectStore("image");
            const imageRequest = imageStore.getAll();
            
            imageRequest.onsuccess = (e) => {
                const images = e.target.result;
                totalMediaCount += images.length;
                
                images.forEach((imageObj) => {
                    this.createMediaElement(imageObj, 'image', galleryCont);
                });
                
                checkEmptyState();
            };
            
            imageRequest.onerror = () => checkEmptyState();
        } catch (error) {
            checkEmptyState();
        }
    }

    createMediaElement(mediaObj, type, container) {
        const mediaElem = document.createElement("div");
        mediaElem.setAttribute("class", "media-cont");
        mediaElem.setAttribute("id", mediaObj.id);

        let mediaHTML;
        if (type === 'video') {
            const url = URL.createObjectURL(mediaObj.blobData);
            mediaHTML = `<video autoplay loop src="${url}"></video>`;
        } else {
            const url = mediaObj.url || URL.createObjectURL(mediaObj.blobData);
            mediaHTML = `<img src="${url}" alt="Captured image">`;
        }

        mediaElem.innerHTML = `
            <div class="media">
                ${mediaHTML}
            </div>
            <div class="delete action-btn">DELETE</div>
            <div class="download action-btn">DOWNLOAD</div>
        `;

        container.appendChild(mediaElem);

        const deleteBtn = mediaElem.querySelector(".delete");
        const downloadBtn = mediaElem.querySelector(".download");
        
        deleteBtn.addEventListener("click", (e) => this.deleteMedia(e));
        downloadBtn.addEventListener("click", (e) => this.downloadMedia(e));
    }

    deleteMedia(e) {
        const id = e.target.parentElement.getAttribute("id");
        const type = id.slice(0, 3);
        
        if (type === "vid") {
            const videoDBTransaction = this.db.transaction("video", "readwrite");
            const videoStore = videoDBTransaction.objectStore("video");
            videoStore.delete(id);
        } else if (type === "img") {
            const imageDBTransaction = this.db.transaction("image", "readwrite");
            const imageStore = imageDBTransaction.objectStore("image");
            imageStore.delete(id);
        }

        e.target.parentElement.remove();
        
        setTimeout(() => {
            const galleryCont = document.querySelector(".gallery-cont");
            if (galleryCont && galleryCont.children.length === 0) {
                this.showEmptyGalleryMessage();
            }
        }, 100);
    }

    downloadMedia(e) {
        const id = e.target.parentElement.getAttribute("id");
        const type = id.slice(0, 3);
        
        if (type === "vid") {
            const videoDBTransaction = this.db.transaction("video", "readwrite");
            const videoStore = videoDBTransaction.objectStore("video");
            const videoRequest = videoStore.get(id);
            
            videoRequest.onsuccess = () => {
                const videoResult = videoRequest.result;
                const videoURL = URL.createObjectURL(videoResult.blobData);
                const a = document.createElement("a");
                a.href = videoURL;
                a.download = "video.mp4";
                a.click();
            };
        } else if (type === "img") {
            const imageDBTransaction = this.db.transaction("image", "readwrite");
            const imageStore = imageDBTransaction.objectStore("image");
            const imageRequest = imageStore.get(id);
            
            imageRequest.onsuccess = () => {
                const imageResult = imageRequest.result;
                const a = document.createElement("a");
                a.href = imageResult.url;
                a.download = "image.jpg";
                a.click();
            };
        }
    }

    showEmptyGalleryMessage() {
        const emptyMsg = document.getElementById('emptyGalleryMessage');
        if (emptyMsg) {
            emptyMsg.style.display = 'flex';
        }
    }

    setupBackButton() {
        const backElem = document.querySelector(".back");
        if (backElem) {
            backElem.addEventListener("click", () => {
                window.location.assign("./index.html");
            });
        }
    }
}

// Initialize gallery when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const galleryApp = new GalleryApp();
    galleryApp.init();
});
