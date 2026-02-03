import { state } from './state.js';
import { elements } from './dom.js';
import { renderView } from './render.js';
import { getDefaultSettings } from './constants.js';
import { syncUIFromState } from './ui.js';

export function switchTab(tabName) {
    state.activeTab = tabName;

    // Ensure settings exist for this tab
    if (!state.tabSettings[tabName]) {
        state.tabSettings[tabName] = getDefaultSettings();
    }

    // Update UI controls to match this tab's settings
    syncUIFromState(tabName);

    // Update active tab UI
    elements.tabItems.forEach(t => {
        if (t.dataset.tab === tabName) t.classList.add('active');
        else t.classList.remove('active');
    });

    // Hide overlay by default
    if (elements.recalcOverlay) elements.recalcOverlay.style.display = 'none';
    elements.imgElement.style.display = 'block';

    if (tabName === 'cube') {
        // Re-render to ensure correct state
        renderView();
    } else if (tabName.startsWith('mom')) {
        const momType = tabName.replace('mom', '');

        // Check if we have the image data
        if (state.momentImages && state.momentImages[momType]) {
            elements.imgElement.src = `data:image/png;base64,${state.momentImages[momType]}`;
            // We might want to trigger a render here if we want to support dynamic re-coloring
            renderView();
        } else {
            // DATA MISSING -> Show Overlay
            elements.imgElement.style.display = 'none';
            if (elements.recalcOverlay) elements.recalcOverlay.style.display = 'flex';
        }
    }
}
