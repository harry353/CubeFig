import { state } from './state.js';
import { elements } from './dom.js';
import * as api from './api.js';
import { getRenderParams } from './render.js';

export async function handleExport(fmt) {
    elements.spinner.style.display = 'block';
    try {
        const params = getRenderParams();
        const payload = { ...params, format: fmt };

        // Add context (Channel or Moment)
        if (state.activeTab === 'cube') {
            payload.channel = state.lastRenderedChannel || 0;
        } else {
            payload.momentType = state.activeTab.replace('mom', '');
        }

        const response = await fetch('/export', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;

            let filename = 'plot';
            if (params.title && params.title.trim() !== '') {
                filename = params.title.toLowerCase().replace(/[()]/g, '').replace(/\s+/g, '_');
            }

            if (state.activeTab !== 'cube') {
                const momType = state.activeTab.replace('mom', '');
                filename += `_moment_${momType}`;
            }

            a.download = `${filename}.${fmt}`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            window.URL.revokeObjectURL(url);
        } else {
            const err = await response.json();
            alert("Export failed: " + (err.error || "Unknown error"));
        }
    } catch (error) {
        console.error("Export Error:", error);
        alert("Export failed.");
    } finally {
        elements.spinner.style.display = 'none';
    }
}
