import { state } from './state.js';
import { elements } from './dom.js';
import * as api from './api.js';
import * as slider from './slider.js';
import { getDefaultSettings } from './constants.js';
import { switchTab } from './tabs.js';
import { renderView } from './render.js';

export function setFileData(data) {
    if (elements.sliderContainer) {
        elements.sliderContainer.style.display = 'flex';
    }

    const max = data.channels - 1;
    state.maxChannels = max;

    // Update slider and manual input ranges
    if (elements.sliderStart) elements.sliderStart.max = max;
    if (elements.sliderEnd) elements.sliderEnd.max = max;
    if (elements.valStart) elements.valStart.max = max;
    if (elements.valEnd) elements.valEnd.max = max;

    // Default values or from CLI
    const c = window.INITIAL_CONFIG || {};
    if (elements.sliderStart) elements.sliderStart.value = c.startChan !== '' ? c.startChan : 0;
    if (elements.sliderEnd) elements.sliderEnd.value = c.endChan !== '' ? c.endChan : max;

    if (elements.valStart) elements.valStart.value = elements.sliderStart.value;
    if (elements.valEnd) elements.valEnd.value = elements.sliderEnd.value;

    if (elements.fileNameLabel && data.filename) {
        elements.fileNameLabel.textContent = data.filename;
    }
    if (elements.maskNameLabel && data.mask_filename) {
        elements.maskNameLabel.textContent = data.mask_filename;
    }

    // Store paths if available (for workspace saving)
    state.file_path = data.file_path;
    state.mask_path = data.mask_path;

    // Clear moments from previous file
    state.momentImages = {};
    state.cubeImage = null;
    state.tabSettings = {}; // Reset tab memory
    state.tabSettings['cube'] = getDefaultSettings();

    elements.tabItems.forEach(tab => {
        if (tab.dataset.tab !== 'cube') tab.classList.add('hidden');
    });
    switchTab('cube');

    slider.updateSliderUI();
}

export async function handleUpload() {
    const file = elements.fileInput.files[0];
    if (!file) return;

    elements.spinner.style.display = 'block';
    elements.imgElement.style.display = 'none';

    try {
        const data = await api.fetchUpload(file);

        if (data.error) {
            alert("Error: " + data.error);
        } else if (data.success) {
            setFileData(data);
            renderView(0);
        }
    } catch (error) {
        console.error('Upload Error:', error);
        alert("Upload failed. Check console for details.");
    } finally {
        elements.spinner.style.display = 'none';
    }
}

export async function handleMaskUpload() {
    const file = elements.maskInput.files[0];
    if (!file) return;

    elements.spinner.style.display = 'block';

    try {
        const data = await api.fetchMaskUpload(file);

        if (data.error) {
            alert("Error loading mask: " + data.error);
            if (elements.maskNameLabel) {
                elements.maskNameLabel.textContent = "Error loading mask";
            }
        } else if (data.success) {
            // If we are on the cube view, re-render to show the effect
            if (state.activeTab === 'cube') {
                renderView(state.lastRenderedChannel);
            }
        }
    } catch (error) {
        console.error('Mask Upload Error:', error);
        alert("Mask upload failed.");
    } finally {
        elements.spinner.style.display = 'none';
    }
}
