import { elements } from './dom.js';
import { state } from './state.js';
import { switchTab } from './tabs.js';
// Coordinate helper is implemented locally

// Assuming render.js might have coordinate helpers, or we write our own.
// Actually, let's write our own helper here or check render.js later.
// For now, I'll implement coordinate mapping here.

let isDrawing = false;
let startPoint = null; // {x, y}
let endPoint = null;   // {x, y}
let canvas = null;
let ctx = null;

export function initPV() {
    // Determine if we need to create canvas
    createOverlayCanvas();

    // Resize observer to keep canvas matched to image
    const resizeObserver = new ResizeObserver(() => {
        syncCanvasSize();
    });
    if (elements.imgElement) {
        resizeObserver.observe(elements.imgElement);
    }
}

function createOverlayCanvas() {
    if (document.getElementById('pvCanvas')) return;

    canvas = document.createElement('canvas');
    canvas.id = 'pvCanvas';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none'; // Default to pass through, enable when drawing
    canvas.style.zIndex = '10'; // Above image

    if (elements.imageWrapper) {
        elements.imageWrapper.appendChild(canvas);
        ctx = canvas.getContext('2d');
        syncCanvasSize();
    }
}

function syncCanvasSize() {
    const img = elements.imgElement;
    if (img && canvas) {
        canvas.width = img.clientWidth;
        canvas.height = img.clientHeight;
        canvas.style.width = `${img.clientWidth}px`;
        canvas.style.height = `${img.clientHeight}px`;
        // Redraw if points exist
        drawOverlay();
    }
}

export function toggleDrawMode() {
    if (!canvas) createOverlayCanvas();

    isDrawing = !isDrawing;
    const btn = elements.pvDrawToggle;

    if (isDrawing) {
        btn.textContent = "Cancel Drawing";
        btn.style.backgroundColor = "#e74c3c"; // Red
        canvas.style.pointerEvents = 'auto'; // Capture clicks
        canvas.style.cursor = 'crosshair';

        // Reset points? Maybe not, allow re-drawing
        startPoint = null;
        endPoint = null;
        drawOverlay();

        // Add listeners
        canvas.addEventListener('mousedown', onMouseDown);
        canvas.addEventListener('mousemove', onMouseMove);
    } else {
        disableDrawMode();
    }
}

function disableDrawMode() {
    isDrawing = false;
    const btn = elements.pvDrawToggle;
    if (btn) {
        btn.textContent = "Draw Slice Line";
        btn.style.backgroundColor = "#e67e22"; // Orange
    }

    if (canvas) {
        canvas.style.pointerEvents = 'none';
        canvas.style.cursor = 'default';
        canvas.removeEventListener('mousedown', onMouseDown);
        canvas.removeEventListener('mousemove', onMouseMove);
    }
}

function getImgCoords(e) {
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    return { x, y };
}

// Map screen coordinates to Image (FITS) coordinates
function mapToImagePixel(screenX, screenY) {
    const img = elements.imgElement;
    // Assuming image fits cover/contain or is simple 100%
    // We need the natural dimensions vs client dimensions
    if (!img) return { x: 0, y: 0 };

    const scaleX = img.naturalWidth / img.clientWidth;
    const scaleY = img.naturalHeight / img.clientHeight;

    // FITS coordinates:
    // 0,0 is usually center of bottom-left pixel in FITS standard?
    // Or 0-indexed numpy array. 
    // Image is usually displayed with (0,0) at top-left in Browser.
    // FITS/Matplotlib origin='lower' puts (0,0) at bottom-left.
    // Our backend uses `origin='lower'`.
    // So browser Y=0 is Backend Y=Max.

    const pixX = screenX * scaleX;

    // Flip Y
    const pixY = (img.clientHeight - screenY) * scaleY;

    return { x: pixX, y: pixY };
}

function onMouseDown(e) {
    const coords = getImgCoords(e);

    if (!startPoint) {
        startPoint = coords;
        // Drawing line...
    } else {
        endPoint = coords;
        // Finished
        updateInputs();
        drawOverlay();
        disableDrawMode();
    }
}

function onMouseMove(e) {
    if (startPoint && !endPoint) {
        const curr = getImgCoords(e);
        drawOverlay(curr);
    }
}

function drawOverlay(mousePos = null) {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    ctx.lineWidth = 2;
    ctx.strokeStyle = '#e74c3c'; // Red
    ctx.fillStyle = '#e74c3c';

    if (startPoint) {
        ctx.beginPath();
        ctx.arc(startPoint.x, startPoint.y, 3, 0, Math.PI * 2);
        ctx.fill();

        let dest = endPoint || mousePos;
        if (dest) {
            ctx.beginPath();
            ctx.moveTo(startPoint.x, startPoint.y);
            ctx.lineTo(dest.x, dest.y);
            ctx.stroke();

            ctx.beginPath();
            ctx.arc(dest.x, dest.y, 3, 0, Math.PI * 2);
            ctx.fill();
        }
    }
}

function updateInputs() {
    if (startPoint && endPoint) {
        const p1 = mapToImagePixel(startPoint.x, startPoint.y);
        const p2 = mapToImagePixel(endPoint.x, endPoint.y);

        if (elements.pvX1) elements.pvX1.value = p1.x.toFixed(1);
        if (elements.pvY1) elements.pvY1.value = p1.y.toFixed(1);
        if (elements.pvX2) elements.pvX2.value = p2.x.toFixed(1);
        if (elements.pvY2) elements.pvY2.value = p2.y.toFixed(1);
    }
}

export async function handleCalculatePV() {
    // Gather inputs
    // Priority: Coordinates vs Center/Angle
    // Should we have a toggle? Or just check which is valid?
    // Let's bias towards coords if they are non-empty and user didn't just type in CA.
    // Actually, easiest is to send all, let backend decide, OR clearing one set when other is typed.
    // For now, let's just send what is available.

    const payload = {
        x1: elements.pvX1.value,
        y1: elements.pvY1.value,
        x2: elements.pvX2.value,
        y2: elements.pvY2.value,
        centerX: elements.pvCenterX.value,
        centerY: elements.pvCenterY.value,
        angle: elements.pvAngle.value,
        length: elements.pvLength.value,

        // Visuals
        title: elements.plotTitleInput.value,
        grid: elements.gridToggle.checked,
        cbarUnit: elements.cbarUnit.value,
        vmin: elements.vminInput.value,
        vmax: elements.vmaxInput.value,
        figWidth: elements.figWidthInput.value,
        figHeight: elements.figHeightInput.value
    };

    const btn = elements.calculatePVBtn;
    const origText = btn.textContent;
    btn.textContent = "Calculating...";
    btn.disabled = true;

    try {
        const response = await fetch('/calculate_pv', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const data = await response.json();

        if (data.error) {
            alert("Error: " + data.error);
        } else if (data.image) {
            displayPVImage(data.image);
        }
    } catch (e) {
        console.error(e);
        alert("Network Error");
    } finally {
        btn.textContent = origText;
        btn.disabled = false;
    }
}

function displayPVImage(b64) {
    // Store in State
    state.pvImage = b64;

    // Switch to PV tab
    const pvTab = document.querySelector('.tab-item[data-tab="pv"]');
    if (pvTab) {
        pvTab.classList.remove('hidden');
        switchTab('pv');
        // switchTab handles the image src update
    }
}
