import { elements } from './dom.js';
import { state } from './state.js';

// Updates the visual colored bar and text boxes
export function updateSliderUI() {
    let start = parseInt(elements.sliderStart.value);
    let end = parseInt(elements.sliderEnd.value);

    // Prevent crossing logic
    // We check which element triggered the event (passed as 'this' context if needed, or by logic)
    if (start > end) {
        // Simple logic: if start is greater, push end to start
        // (For a perfect implementation, we usually need to know which handle was dragged,
        // but locking them to match is a safe fallback)
        if (document.activeElement === elements.sliderStart) {
            elements.sliderStart.value = end;
            start = end;
        } else {
            elements.sliderEnd.value = start;
            end = start;
        }
    }

    // Update Input Text
    elements.valStart.value = start;
    elements.valEnd.value = end;

    // Update Colored Bar
    const percentStart = (start / state.maxChannels) * 100;
    const percentEnd = (end / state.maxChannels) * 100;

    elements.sliderRange.style.left = percentStart + "%";
    elements.sliderRange.style.width = (percentEnd - percentStart) + "%";
}

// Logic for when the user types a number manually
export function validateInputValues(isStartBox) {
    let start = parseInt(elements.valStart.value);
    let end = parseInt(elements.valEnd.value);
    
    // NaN Checks
    if (isNaN(start)) start = 0;
    if (isNaN(end)) end = 0;

    // Boundary Checks
    if (start < 0) start = 0;
    if (end > state.maxChannels) end = state.maxChannels;
    
    // Crossing Checks
    if (start > end) {
        if (isStartBox) end = start; 
        else start = end;
    }

    // Update Internal Sliders
    elements.sliderStart.value = start;
    elements.sliderEnd.value = end;
    
    updateSliderUI(); // Refresh visuals

    return { start, end };
}