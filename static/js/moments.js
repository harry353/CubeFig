import { state } from './state.js';
import { elements } from './dom.js';
import * as api from './api.js';
import { getDefaultSettings } from './constants.js';
import { getRenderParams } from './render.js';
import { switchTab } from './tabs.js';

export async function handleMomentCalculation() {
    const start = elements.valStart.value;
    const end = elements.valEnd.value;
    const moments = [];
    if (elements.mom0Toggle.checked) moments.push('0');
    if (elements.mom1Toggle.checked) moments.push('1');
    if (elements.mom2Toggle.checked) moments.push('2');

    if (moments.length === 0) {
        alert("Please select at least one moment to calculate.");
        return;
    }

    elements.spinner.style.display = 'block';
    try {
        const params = getRenderParams();
        const response = await fetch('/calculate_moments', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                startChan: start,
                endChan: end,
                moments: moments,
                ...params
            })
        });
        const data = await response.json();

        if (data.images) {
            Object.keys(data.images).forEach(key => {
                const tabId = `mom${key}`;
                state.momentImages[key] = data.images[key];
                // Initialize settings for the new moment tab
                state.tabSettings[tabId] = getDefaultSettings();

                // Reveal the tab
                const tab = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
                if (tab) tab.classList.remove('hidden');
            });

            // Switch to the first calculated moment
            switchTab(`mom${moments[0]}`);
        }
    } catch (err) {
        console.error("Moment calculation error:", err);
        alert("Failed to calculate moments. Check console for details.");
    } finally {
        elements.spinner.style.display = 'none';
    }
}
