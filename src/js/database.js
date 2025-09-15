// Database management for IndexedDB
export function initializeDatabase() {
    return new Promise((resolve, reject) => {
        let db;
        const openRequest = indexedDB.open("myDataBase", 1);
        
        openRequest.addEventListener("success", (e) => {
            console.log("DB Success");
            db = openRequest.result;
            resolve(db);
        });
        
        openRequest.addEventListener("error", (e) => {
            console.log("DB error");
            reject(e);
        });
        
        openRequest.addEventListener("upgradeneeded", (e) => {
            console.log("DB upgraded and also for initial DB creation");
            db = openRequest.result;

            if (!db.objectStoreNames.contains("video")) {
                db.createObjectStore("video", { keyPath: "id" });
            }
            if (!db.objectStoreNames.contains("image")) {
                db.createObjectStore("image", { keyPath: "id" });
            }
        });
    });
}

export class DatabaseManager {
    constructor(db) {
        this.db = db;
    }

    saveVideo(videoData) {
        if (!this.db) return;
        
        const videoID = this.generateId();
        const dbTransaction = this.db.transaction("video", "readwrite");
        const videoStore = dbTransaction.objectStore("video");
        const videoEntry = {
            id: `vid-${videoID}`,
            blobData: videoData,
            timestamp: Date.now()
        };
        return videoStore.add(videoEntry);
    }

    saveImage(imageData) {
        if (!this.db) return;
        
        const imageID = this.generateId();
        const dbTransaction = this.db.transaction("image", "readwrite");
        const imageStore = dbTransaction.objectStore("image");
        const imageEntry = {
            id: `img-${imageID}`,
            url: imageData,
            timestamp: Date.now()
        };
        return imageStore.add(imageEntry);
    }

    generateId() {
        return window.shortid ? window.shortid() : Math.random().toString(36).substr(2, 9);
    }
}
