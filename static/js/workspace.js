import { state } from './state.js';
import { elements } from './dom.js';
import { setFileData } from './upload.js';
import { switchTab } from './tabs.js';

// No circular dependency with UI? setFileData uses UI...
// workspace.js -> upload.js -> ui.js
// This seems fine.

export function saveWorkspace() {
    const workspace = {
        version: 1.1,
        timestamp: new Date().toISOString(),
        filename: elements.fileNameLabel ? elements.fileNameLabel.textContent : '',
        file_path: state.file_path || null,
        mask_filename: elements.maskNameLabel ? elements.maskNameLabel.textContent : '',
        mask_path: state.mask_path || null,
        activeTab: state.activeTab,
        tabSettings: state.tabSettings,
        moments: Object.keys(state.momentImages)
    };

    const jsonStr = JSON.stringify(workspace, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Construct filename: fits_name_YY:MM:SS@HH:MM:SS
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const hh = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    const ss = String(now.getSeconds()).padStart(2, '0');

    let baseName = 'workspace';
    if (workspace.filename) {
        // Remove extension if present
        baseName = workspace.filename.replace(/\.fits$/i, '').replace(/\.fit$/i, '');
    }

    // Requested format: YY:MM:SS@HH:MM:SS
    const timeStr = `${yy}:${mm}:${dd}@${hh}:${min}:${ss}`;
    const finalName = `${baseName}_${timeStr}.json`;

    const a = document.createElement('a');
    a.href = url;
    a.download = finalName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

export function loadWorkspace(file) {
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const workspace = JSON.parse(e.target.result);
            elements.spinner.style.display = 'block';

            let loadSuccess = false;

            // 1. Try to load from path if available
            if (workspace.file_path) {
                try {
                    console.log("Attempting to auto-load file from:", workspace.file_path);
                    const loadResp = await fetch('/load_from_path', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            file_path: workspace.file_path,
                            mask_path: workspace.mask_path,
                            mask_filename: workspace.mask_filename
                        })
                    });

                    if (loadResp.ok) {
                        const data = await loadResp.json();
                        setFileData(data);
                        loadSuccess = true;
                        console.log("Auto-load successful");
                    } else {
                        console.warn("Auto-load failed, server returned error");
                    }
                } catch (err) {
                    console.error("Auto-load request error:", err);
                }
            }

            // 2. If valid file not loaded automatically, check if current file matches or warn
            if (!loadSuccess) {
                const currentFile = elements.fileNameLabel ? elements.fileNameLabel.textContent : '';
                if (workspace.filename && (!currentFile || workspace.filename !== currentFile)) {
                    alert(`Could not auto-load the file "${workspace.filename}".\nPlease ensure the file is loaded manually before restoring settings.`);
                }
            }

            // Restore Settings
            state.tabSettings = workspace.tabSettings || {};

            // Restore Moments (Visuals)
            if (workspace.moments && workspace.moments.length > 0) {
                workspace.moments.forEach(m => {
                    const tabId = `mom${m}`;
                    const tab = document.querySelector(`.tab-item[data-tab="${tabId}"]`);
                    if (tab) tab.classList.remove('hidden');

                    // Also check the toggle box so Recalculate works
                    const toggle = document.getElementById(`mom${m}Toggle`);
                    if (toggle) toggle.checked = true;
                });
            }

            // Switch to saved tab
            switchTab(workspace.activeTab || 'cube');

            // Force update UI for current tab?
            // syncUIFromState should handle this inside switchTab (called above), IF state.tabSettings is set (it is).

            alert("Workspace loaded successfully.");

        } catch (err) {
            console.error("Load Workspace Error:", err);
            alert("Failed to load workspace.");
        } finally {
            elements.spinner.style.display = 'none';
        }
    };
    reader.readAsText(file);
}
