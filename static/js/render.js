import { state } from './state.js';
import { elements } from './dom.js';
import * as api from './api.js';
import { getDefaultSettings } from './constants.js';
import { updateStateFromUI } from './ui.js';

export function getRenderParams() {
    return state.tabSettings[state.activeTab] || getDefaultSettings();
}

export async function renderView(index) {
    if (state.isRendering || state.isSyncing) return;

    // Ensure state is up to date with UI before rendering
    updateStateFromUI();

    const activeSettings = state.tabSettings[state.activeTab];
    if (index !== undefined) {
        activeSettings.channel = index;
    }
    const channelToRender = activeSettings.channel;

    state.isRendering = true;
    elements.spinner.style.display = 'block';

    const params = getRenderParams();

    try {
        let data;
        if (state.activeTab === 'cube') {
            state.lastRenderedChannel = channelToRender;
            data = await api.fetchRender({
                channel: channelToRender,
                ...params
            });
            if (data && data.image) {
                state.cubeImage = data.image;
            }
        } else {
            const momType = state.activeTab.replace('mom', '');
            data = await api.fetchRenderMoment({
                momentType: momType,
                ...params
            });
            if (data && data.image) {
                state.momentImages[momType] = data.image;
            }
        }

        if (data && data.image) {
            elements.imgElement.src = 'data:image/png;base64,' + data.image;
            elements.imgElement.style.display = 'block';
        } else if (data && data.error) {
            console.error("Server Error:", data.error);
        }
    } catch (error) {
        console.error("Render Error:", error);
    } finally {
        elements.spinner.style.display = 'none';
        state.isRendering = false;
    }
}
