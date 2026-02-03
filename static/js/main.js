import { setupEventListeners } from './events.js';
import { elements } from './dom.js';

// Entry Point
document.addEventListener('DOMContentLoaded', () => {
    // Initial Config Setup (Sync DOM with Window.INITIAL_CONFIG)
    // This part should technically be in ui.js or its own init, OR we can just leave it here as it "bootstraps" the DOM state before events are attached.
    // Ideally, setupEventListeners calls initializeUI, which might rely on DOM state. 

    // Let's migrate the INITIAL_CONFIG block to ui.js or keep it here.
    // Keeping it here for clarity that it's bootstrap logic.
    // Actually, `ui.js` has `initializeUI` but that fetches /status.
    // The initial config block modifies DOM elements based on `window.INITIAL_CONFIG`.

    if (window.INITIAL_CONFIG) {
        const c = window.INITIAL_CONFIG;
        if (elements.plotTitleInput) elements.plotTitleInput.value = c.title || '';
        if (elements.gridToggle) elements.gridToggle.checked = !!c.grid;
        if (elements.figWidthInput) elements.figWidthInput.value = c.figWidth || 8;
        if (elements.figHeightInput) elements.figHeightInput.value = c.figHeight || 8;
        if (elements.beamToggle) elements.beamToggle.checked = !!c.showBeam;
        if (elements.centerToggle) {
            elements.centerToggle.checked = !!c.showCenter;
            // Manually trigger change to enable sub-inputs?
            // Events aren't set up yet, so dispatchEvent won't trigger listeners.
            // But we can check it. The listeners in events.js will handle future changes.
            // However, we need to set the initial disabled state of sub-inputs.
            // We can do this by moving the bootstrap logic into events.js OR simply by calling a bootstrap function.
        }
        // ... (The rest of the config logic was long)
        // To be clean, I'll move this bootstrap logic to ui.js into a function `applyInitialConfig` and call it here.
    }

    // Better yet, let's just use the `setupEventListeners` and inside `events.js` call `applyInitialConfig` from `ui.js`.
    // I'll update `ui.js` to include `applyInitialConfig` and call it from `events.js` or here.
    // For now, I'll keep the minimal entry point.

    // Actually, since I didn't add `applyInitialConfig` to `ui.js` yet, I should add it or just paste the logic here.
    // Pasting logic here keeps `main.js` as the "Bootstrapper".

    if (window.INITIAL_CONFIG) {
        const c = window.INITIAL_CONFIG;
        if (elements.plotTitleInput) elements.plotTitleInput.value = c.title || '';
        if (elements.gridToggle) elements.gridToggle.checked = !!c.grid;
        if (elements.figWidthInput) elements.figWidthInput.value = c.figWidth || 8;
        if (elements.figHeightInput) elements.figHeightInput.value = c.figHeight || 8;
        if (elements.beamToggle) elements.beamToggle.checked = !!c.showBeam;

        if (elements.centerToggle) {
            elements.centerToggle.checked = !!c.showCenter;
            const active = !!c.showCenter;
            if (active) elements.centerInputsContainer.classList.add('active');
            else elements.centerInputsContainer.classList.remove('active');

            elements.centerXInput.disabled = !active;
            elements.centerYInput.disabled = !active;
            if (elements.offsetToggle) {
                elements.offsetToggle.disabled = !active;
                if (!active) elements.offsetToggle.checked = false;
            }
        }

        if (elements.offsetToggle) {
            elements.offsetToggle.checked = !!c.showOffset;
            if (elements.offsetUnit) elements.offsetUnit.value = c.offsetAngleUnit || 'arcsec';
            if (elements.offsetUnit) elements.offsetUnit.disabled = !c.showOffset;
        }

        if (elements.centerXInput) elements.centerXInput.value = c.centerX || '';
        if (elements.centerYInput) elements.centerYInput.value = c.centerY || '';

        if (elements.physicalToggle) {
            elements.physicalToggle.checked = !!c.showPhysical;
            const active = !!c.showPhysical;
            if (elements.distanceInput) elements.distanceInput.disabled = !active;
            if (elements.distanceUnit) elements.distanceUnit.disabled = !active;
        }

        if (elements.distanceInput) elements.distanceInput.value = c.distanceVal || '';
        if (elements.distanceUnit) elements.distanceUnit.value = c.distanceUnit || 'Mpc';

        if (elements.normGlobalToggle) {
            elements.normGlobalToggle.checked = !!c.normGlobal;
            if (elements.vminInput) elements.vminInput.disabled = !!c.normGlobal;
            if (elements.vmaxInput) elements.vmaxInput.disabled = !!c.normGlobal;
        }

        if (elements.cbarUnit) elements.cbarUnit.value = c.cbarUnit || 'None';
        if (elements.vminInput) elements.vminInput.value = c.vmin || '';
        if (elements.vmaxInput) elements.vmaxInput.value = c.vmax || '';

        // Display initial filename if pre-loaded
        if (elements.fileNameLabel && c.filename) {
            elements.fileNameLabel.textContent = c.filename;
        }
        if (elements.maskNameLabel && c.mask_filename) {
            elements.maskNameLabel.textContent = c.mask_filename;
        }
    }

    setupEventListeners();
});