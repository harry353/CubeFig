import { elements } from './dom.js';
import { state } from './state.js';
import * as slider from './slider.js';
import { getDefaultSettings } from './constants.js';
import { setFileData } from './upload.js'; // This will be created next
import { renderView } from './render.js';
import * as api from './api.js';

export function syncUIFromState(tabId) {
    const s = state.tabSettings[tabId];
    if (!s) return;

    state.isSyncing = true;

    // Sync channel
    if (elements.sliderStart) elements.sliderStart.value = s.channel;
    if (elements.valStart) elements.valStart.value = s.channel;
    slider.updateSliderUI();

    if (elements.plotTitleInput) elements.plotTitleInput.value = s.title;
    if (elements.figWidthInput) elements.figWidthInput.value = s.figWidth;
    if (elements.figHeightInput) elements.figHeightInput.value = s.figHeight;
    if (elements.gridToggle) elements.gridToggle.checked = s.grid;
    if (elements.beamToggle) elements.beamToggle.checked = s.showBeam;
    if (elements.centerToggle) {
        elements.centerToggle.checked = s.showCenter;
        elements.centerToggle.dispatchEvent(new Event('change'));
    }
    if (elements.centerXInput) elements.centerXInput.value = s.centerX;
    if (elements.centerYInput) elements.centerYInput.value = s.centerY;
    if (elements.offsetToggle) {
        elements.offsetToggle.checked = s.showOffset;
        elements.offsetToggle.dispatchEvent(new Event('change'));
    }
    if (elements.offsetUnit) elements.offsetUnit.value = s.offsetAngleUnit;
    if (elements.physicalToggle) {
        elements.physicalToggle.checked = s.showPhysical;
        elements.physicalToggle.dispatchEvent(new Event('change'));
    }
    if (elements.distanceInput) elements.distanceInput.value = s.distanceVal;
    if (elements.distanceUnit) elements.distanceUnit.value = s.distanceUnit;

    if (elements.normGlobalToggle) {
        elements.normGlobalToggle.checked = s.normGlobal;
        if (elements.vminInput) elements.vminInput.disabled = !!s.normGlobal;
        if (elements.vmaxInput) elements.vmaxInput.disabled = !!s.normGlobal;
    }
    if (elements.vminInput) elements.vminInput.value = s.vmin;
    if (elements.vmaxInput) elements.vmaxInput.value = s.vmax;
    if (elements.cbarUnit) elements.cbarUnit.value = s.cbarUnit;
    if (elements.invertMask) elements.invertMask.checked = !!s.invertMask;

    state.isSyncing = false;
}

export function updateStateFromUI() {
    if (state.isSyncing) return;
    state.tabSettings[state.activeTab] = getDefaultSettings();
}

export async function initializeUI() {
    try {
        const response = await fetch('/status');
        const data = await response.json();
        if (data.is_loaded) {
            setFileData(data);
            renderView(0);
        }
    } catch (e) {
        console.error("Initialization error:", e);
    }
}
