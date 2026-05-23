importScripts("https://cdn.jsdelivr.net/pyodide/v0.29.4/full/pyodide.js");

let pyodide;

async function init() {
    try {
        pyodide = await loadPyodide();
        await pyodide.loadPackage(["numpy"]);
        
        const response = await fetch('pyScripts/test.py');
        const pythonCode = await response.text();
        await pyodide.runPythonAsync(pythonCode);
        
        self.postMessage({ type: 'READY' });
    } catch (err) {
        self.postMessage({ type: 'ERROR', error: "Init failed: " + err.message });
    }
}

self.onmessage = async (e) => {
    if (e.data.type === 'INIT') {
        await init();
    } else if (e.data.type === 'PROCESS') {
        const { pixels, brightness, contrast, isExport } = e.data;
        
        try {
            const processFunc = pyodide.globals.get('processImageModule');
            const result = processFunc(pixels, brightness, contrast);
            
            const processedPixels = result.toJs();
            result.destroy();
            
            self.postMessage({ 
                type: 'RESULT', 
                pixels: processedPixels,
                brightness: brightness,
                contrast: contrast,
                isExport: isExport
            }, [processedPixels.buffer]);
        } catch (err) {
            self.postMessage({ type: 'ERROR', error: "Process failed: " + err.message });
        }
    }
};
