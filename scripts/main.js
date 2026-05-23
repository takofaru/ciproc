const canvas = document.getElementById("image_canvas");
const ctx = canvas.getContext("2d");

const brightnessRange = document.getElementById("brightness_range");
const contrastRange = document.getElementById("contrast_range");
const fileInput = document.getElementById("image_field");
const exportBtn = document.getElementById("export_btn");
const status = document.getElementById("status");

let worker;
let originalImageData; // Full resolution
let workingImageData;  // 480p proxy
let isWorkerBusy = false;
let isExporting = false;

function initWorker() {
    worker = new Worker('worker.js');
    worker.onmessage = (e) => {
        const message = e.data;
        if (message.type === 'READY') {
            status.innerText = "Ready!";
        } else if (message.type === 'RESULT') {
            const newPixels = new Uint8ClampedArray(message.pixels);
            
            if (message.isExport) {
                downloadImage(newPixels, originalImageData.width, originalImageData.height);
                status.innerText = "Export Complete!";
                isExporting = false;
            } else {
                const newImageData = new ImageData(newPixels, canvas.width, canvas.height);
                ctx.putImageData(newImageData, 0, 0);
                status.innerText = `Preview Updated (B: ${message.brightness}, C: ${message.contrast})`;
            }
            
            isWorkerBusy = false;
        } else if (message.type === 'ERROR') {
            status.innerText = "Error: " + message.error;
            isWorkerBusy = false;
            isExporting = false;
        }
    };
    worker.postMessage({ type: 'INIT' });
}

function sendToWorker(brightness, contrast, isExport = false) {
    const dataToProcess = isExport ? originalImageData : workingImageData;
    
    if (!dataToProcess || isWorkerBusy) return;

    if (isExport) isExporting = true;
    isWorkerBusy = true;
    status.innerText = isExport ? "Exporting Original..." : "Processing Preview...";
    
    const pixels = new Uint8ClampedArray(dataToProcess.data);
    
    worker.postMessage({
        type: 'PROCESS',
        pixels: pixels,
        brightness: brightness,
        contrast: contrast,
        isExport: isExport
    });
}

function downloadImage(pixels, width, height) {
    const offscreen = document.createElement('canvas');
    offscreen.width = width;
    offscreen.height = height;
    const oCtx = offscreen.getContext('2d');
    const imgData = new ImageData(pixels, width, height);
    oCtx.putImageData(imgData, 0, 0);
    
    const link = document.createElement('a');
    link.download = 'processed_image.png';
    link.href = offscreen.toDataURL();
    link.click();
}

fileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
            // 1. Store Original Data (Full Resolution)
            const tempCanvas = document.createElement('canvas');
            tempCanvas.width = img.width;
            tempCanvas.height = img.height;
            const tCtx = tempCanvas.getContext('2d');
            tCtx.drawImage(img, 0, 0);
            originalImageData = tCtx.getImageData(0, 0, img.width, img.height);

            // 2. Setup Preview Scale (480p)
            const targetHeight = 480;
            const ratio = Math.min(1, targetHeight / img.height);
            const targetWidth = img.width * ratio;

            canvas.width = targetWidth;
            canvas.height = img.height * ratio;
            ctx.drawImage(img, 0, 0, targetWidth, canvas.height);
            
            workingImageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

            brightnessRange.value = 0;
            contrastRange.value = 0;
            document.getElementById("b_label").innerText = "Brightness: 0";
            document.getElementById("c_label").innerText = "Contrast: 0";
            status.innerText = "Image Loaded";
        };
        img.src = event.target.result;
    };
    reader.readAsDataURL(file);
});

// Trigger processing only when user releases the slider (change event)
const processUpdate = () => {
    if (isWorkerBusy) return;
    const b = parseFloat(brightnessRange.value);
    const c = parseFloat(contrastRange.value);
    sendToWorker(b, c, false);
};

// Update labels in real-time while sliding, but don't process yet
const updateLabels = () => {
    document.getElementById("b_label").innerText = `Brightness: ${brightnessRange.value}`;
    document.getElementById("c_label").innerText = `Contrast: ${contrastRange.value}`;
};

brightnessRange.addEventListener("input", updateLabels);
contrastRange.addEventListener("input", updateLabels);

// Process only after "mousehold" is released
brightnessRange.addEventListener("change", processUpdate);
contrastRange.addEventListener("change", processUpdate);

exportBtn.addEventListener("click", () => {
    if (!originalImageData || isExporting || isWorkerBusy) return;
    sendToWorker(parseFloat(brightnessRange.value), parseFloat(contrastRange.value), true);
});

initWorker();
