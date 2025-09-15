let db;

function initGallery() {
  if (!window.indexedDB) {
    return;
  }
  
  const request = indexedDB.open("procam-studio", 1);
  
  request.onerror = function() {
    // Keep empty message visible
  };
  
  request.onsuccess = function(event) {
    db = event.target.result;
    loadMediaFromDatabase();
  };
  
  request.onupgradeneeded = function(event) {
    db = event.target.result;
    
    if (!db.objectStoreNames.contains("video")) {
      db.createObjectStore("video", { keyPath: "id" });
    }
    if (!db.objectStoreNames.contains("image")) {
      db.createObjectStore("image", { keyPath: "id" });
    }
  };
}

document.addEventListener('DOMContentLoaded', initGallery);

function loadMediaFromDatabase() {
  const galleryCont = document.querySelector(".gallery-cont");
  if (!galleryCont) {
    return;
  }
  
  let totalMediaCount = 0;
  let completedStores = 0;
  
  function checkEmptyState() {
    completedStores++;
    if (completedStores === 2) {
      const emptyMsg = document.getElementById('emptyGalleryMessage');
      if (totalMediaCount === 0) {
        if (emptyMsg) emptyMsg.style.display = 'flex';
      } else {
        if (emptyMsg) emptyMsg.style.display = 'none';
      }
    }
  }
  
  // Load videos
  try {
    const videoTransaction = db.transaction("video", "readonly");
    const videoStore = videoTransaction.objectStore("video");
    const videoRequest = videoStore.getAll();
    
    videoRequest.onsuccess = function(e) {
      const videos = e.target.result;
      totalMediaCount += videos.length;
      
      videos.forEach((videoObj) => {
        const mediaElem = document.createElement("div");
        mediaElem.setAttribute("class", "media-cont");
        mediaElem.setAttribute("id", videoObj.id);

        const url = URL.createObjectURL(videoObj.blobData);

        mediaElem.innerHTML = `
          <div class="media">
            <video autoplay loop src="${url}"></video>
          </div>
          <div class="delete action-btn">DELETE</div>
          <div class="download action-btn">DOWNLOAD</div>
        `;

        galleryCont.appendChild(mediaElem);

        let deleteBtn = mediaElem.querySelector(".delete");
        deleteBtn.addEventListener("click", deleteListener);
        let downloadBtn = mediaElem.querySelector(".download");
        downloadBtn.addEventListener("click", downloadListener);
      });
      
      checkEmptyState();
    };
    
    videoRequest.onerror = function() {
      checkEmptyState();
    };
  } catch (error) {
    checkEmptyState();
  }
  
  // Load images
  try {
    const imageTransaction = db.transaction("image", "readonly");
    const imageStore = imageTransaction.objectStore("image");
    const imageRequest = imageStore.getAll();
    
    imageRequest.onsuccess = function(e) {
      const images = e.target.result;
      totalMediaCount += images.length;
      
      images.forEach((imageObj) => {
        const mediaElem = document.createElement("div");
        mediaElem.setAttribute("class", "media-cont");
        mediaElem.setAttribute("id", imageObj.id);

        const url = URL.createObjectURL(imageObj.blobData);

        mediaElem.innerHTML = `
          <div class="media">
            <img src="${url}" alt="Captured image">
          </div>
          <div class="delete action-btn">DELETE</div>
          <div class="download action-btn">DOWNLOAD</div>
        `;

        galleryCont.appendChild(mediaElem);

        let deleteBtn = mediaElem.querySelector(".delete");
        deleteBtn.addEventListener("click", deleteListener);
        let downloadBtn = mediaElem.querySelector(".download");
        downloadBtn.addEventListener("click", downloadListener);
      });
      
      checkEmptyState();
    };
    
    imageRequest.onerror = function() {
      checkEmptyState();
    };
  } catch (error) {
    checkEmptyState();
  }
}

function showEmptyGalleryMessage() {
  const existingMessages = document.querySelectorAll('.empty-gallery-message');
  existingMessages.forEach(msg => msg.remove());
  
  const emptyMessage = document.createElement("div");
  emptyMessage.className = 'empty-gallery-message';
  emptyMessage.style.cssText = `
    position: fixed !important;
    top: 50% !important;
    left: 50% !important;
    transform: translate(-50%, -50%) !important;
    display: flex !important;
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    padding: 3rem !important;
    background: rgba(26, 26, 26, 0.95) !important;
    border-radius: 20px !important;
    border: 1px solid rgba(255, 255, 255, 0.2) !important;
    backdrop-filter: blur(20px) !important;
    z-index: 9999 !important;
    min-width: 300px !important;
    max-width: 90vw !important;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.8) !important;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
  `;
  
  emptyMessage.innerHTML = `
    <div style="margin-bottom: 2rem;">
      <div style="font-size: 4rem; color: #3b82f6; margin-bottom: 1rem; display: block;">📷</div>
    </div>
    <h2 style="color: #ffffff !important; margin-bottom: 1rem !important; font-size: 1.8rem !important; font-weight: 600 !important;">No media yet</h2>
    <p style="color: #9ca3af !important; margin-bottom: 2rem !important; font-size: 1.1rem !important; line-height: 1.5 !important;">Click here to capture photos or record videos</p>
    <button style="
      background: linear-gradient(135deg, #3b82f6, #2563eb) !important;
      color: white !important;
      border: none !important;
      padding: 1rem 2rem !important;
      border-radius: 25px !important;
      font-size: 1rem !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.3s ease !important;
      box-shadow: 0 4px 16px rgba(59, 130, 246, 0.3) !important;
    ">Start Capturing</button>
  `;
  
  document.body.appendChild(emptyMessage);
  
  emptyMessage.addEventListener("click", () => {
    window.location.href = "./index.html";
  });
}

// UI remove, DB remove
function deleteListener(e) {
  // DB removal
  let id = e.target.parentElement.getAttribute("id");
  let type = id.slice(0, 3);
  if (type === "vid") {
    let videoDBTransaction = db.transaction("video", "readwrite");
    let videoStore = videoDBTransaction.objectStore("video");
    videoStore.delete(id);
  } else if (type === "img") {
    let imageDBTransaction = db.transaction("image", "readwrite");
    let imageStore = imageDBTransaction.objectStore("image");
    imageStore.delete(id);
  }

  // UI removal
  e.target.parentElement.remove();
  
  // Check if gallery is now empty after deletion
  setTimeout(() => {
    let galleryCont = document.querySelector(".gallery-cont");
    if (galleryCont.children.length === 0) {
      showEmptyGalleryMessage();
    }
  }, 100);
}

function downloadListener(e) {
  let id = e.target.parentElement.getAttribute("id");
  let type = id.slice(0, 3);
  if (type === "vid") {
    let videoDBTransaction = db.transaction("video", "readwrite");
    let videoStore = videoDBTransaction.objectStore("video");
    let videoRequest = videoStore.get(id);
    videoRequest.onsuccess = (e) => {
      let videoResult = videoRequest.result;

      let videoURL = URL.createObjectURL(videoResult.blobData);

      let a = document.createElement("a");
      a.href = videoURL;
      a.download = "stream.mp4";
      a.click();
    };
  } else if (type === "img") {
    let imageDBTransaction = db.transaction("image", "readwrite");
    let imageStore = imageDBTransaction.objectStore("image");
    let imageRequest = imageStore.get(id);
    imageRequest.onsuccess = (e) => {
      let imageResult = imageRequest.result;

      let a = document.createElement("a");
      a.href = imageResult.url;
      a.download = "image.jpg";
      a.click();
    };
  }
}
