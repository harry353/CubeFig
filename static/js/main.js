import { elements } from './dom.js';
import { state } from './state.js';
import * as api from './api.js';
import * as slider from './slider.js';

document.addEventListener('DOMContentLoaded', () => {
    // --- INITIAL CONFIG ---
    if (window.INITIAL_CONFIG) {
        const c = window.INITIAL_CONFIG;
        if (elements.plotTitleInput) elements.plotTitleInput.value = c.title || '';
        if (elements.gridToggle) elements.gridToggle.checked = !!c.grid;
        if (elements.figWidthInput) elements.figWidthInput.value = c.figWidth || 8;
        if (elements.figHeightInput) elements.figHeightInput.value = c.figHeight || 8;
        if (elements.beamToggle) elements.beamToggle.checked = !!c.showBeam;
        if (elements.centerToggle) {
            elements.centerToggle.checked = !!c.showCenter;
            // Manually trigger change to enable sub-inputs
            elements.centerToggle.dispatchEvent(new Event('change'));
        }
        if (elements.offsetToggle) {
            elements.offsetToggle.checked = !!c.showOffset;
            if (elements.offsetUnit) {
                elements.offsetUnit.value = c.offsetAngleUnit || 'arcsec';
            }
            elements.offsetToggle.dispatchEvent(new Event('change'));
        }
        if (elements.centerXInput) elements.centerXInput.value = c.centerX || '';
        if (elements.centerYInput) elements.centerYInput.value = c.centerY || '';
        if (elements.physicalToggle) {
            elements.physicalToggle.checked = !!c.showPhysical;
            elements.physicalToggle.dispatchEvent(new Event('change'));
        }
        if (elements.distanceInput) elements.distanceInput.value = c.distanceVal || '';
        if (elements.distanceUnit) elements.distanceUnit.value = c.distanceUnit || 'Mpc';
        if (elements.normGlobalToggle) elements.normGlobalToggle.checked = !!c.normGlobal;
        if (elements.cbarUnit) elements.cbarUnit.value = c.cbarUnit || 'None';

        // Display initial filename if pre-loaded
        if (elements.fileNameLabel && c.filename) {
            elements.fileNameLabel.textContent = c.filename;
        }
        if (elements.maskNameLabel && c.mask_filename) {
            elements.maskNameLabel.textContent = c.mask_filename;
        }

        if (elements.vminInput) elements.vminInput.value = c.vmin || '';
        if (elements.vmaxInput) elements.vmaxInput.value = c.vmax || '';

        initializeUI();
    }

    async function initializeUI() {
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

    function setFileData(data) {
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

    function getDefaultSettings() {
        return {
            channel: slider.getSliderValues ? slider.getSliderValues().start : 0,
            title: elements.plotTitleInput ? elements.plotTitleInput.value : '',
            figWidth: elements.figWidthInput ? elements.figWidthInput.value : 8,
            figHeight: elements.figHeightInput ? elements.figHeightInput.value : 8,
            grid: elements.gridToggle ? elements.gridToggle.checked : false,
            showBeam: elements.beamToggle ? elements.beamToggle.checked : false,
            showCenter: elements.centerToggle ? elements.centerToggle.checked : false,
            centerX: elements.centerXInput ? elements.centerXInput.value : '',
            centerY: elements.centerYInput ? elements.centerYInput.value : '',
            showOffset: elements.offsetToggle ? elements.offsetToggle.checked : false,
            offsetAngleUnit: elements.offsetUnit ? elements.offsetUnit.value : 'arcsec',
            showPhysical: elements.physicalToggle ? elements.physicalToggle.checked : false,
            distanceVal: elements.distanceInput ? elements.distanceInput.value : '',
            distanceUnit: elements.distanceUnit ? elements.distanceUnit.value : 'Mpc',
            normGlobal: elements.normGlobalToggle ? elements.normGlobalToggle.checked : false,
            vmin: elements.vminInput ? elements.vminInput.value : '',
            vmax: elements.vmaxInput ? elements.vmaxInput.value : '',
            cbarUnit: elements.cbarUnit ? elements.cbarUnit.value : 'None',
            invertMask: elements.invertMask ? elements.invertMask.checked : false
        };
    }

    function syncUIFromState(tabId) {
        const s = state.tabSettings[tabId];
        if (!s) return;

        state.isSyncing = true;

        // Sync channel if applicable (only for cube view really, but UI should match)
        if (elements.sliderStart) elements.sliderStart.value = s.channel;
        if (elements.valStart) elements.valStart.value = s.channel;
        slider.updateSliderUI(); // Refresh the visual slider

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
        if (elements.distanceInput) elements.distanceInput.value = s.distanceVal;
        if (elements.distanceUnit) elements.distanceUnit.value = s.distanceUnit;
        if (elements.normGlobalToggle) {
            elements.normGlobalToggle.checked = s.normGlobal;
            // Update input state (disabled if normGlobal is true)
            if (elements.vminInput) elements.vminInput.disabled = !!s.normGlobal;
            if (elements.vmaxInput) elements.vmaxInput.disabled = !!s.normGlobal;
        }
        if (elements.vminInput) elements.vminInput.value = s.vmin;
        if (elements.vmaxInput) elements.vmaxInput.value = s.vmax;
        if (elements.cbarUnit) elements.cbarUnit.value = s.cbarUnit;
        if (elements.invertMask) elements.invertMask.checked = !!s.invertMask;

        state.isSyncing = false;
    }

    function updateStateFromUI() {
        if (state.isSyncing) return;
        state.tabSettings[state.activeTab] = getDefaultSettings();
    }

    function getRenderParams() {
        // Now returns settings from state for the active tab
        return state.tabSettings[state.activeTab] || getDefaultSettings();
    }

    async function renderView(index) {
        if (state.isRendering || state.isSyncing) return;

        // Ensure state is up to date with UI before rendering
        updateStateFromUI();

        // If an explicit index is provided, use it, otherwise use stored channel
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
                // If it's a moment error, maybe switch back to cube?
            }
        } catch (error) {
            console.error("Render Error:", error);
        } finally {
            elements.spinner.style.display = 'none';
            state.isRendering = false;
        }
    }

    function switchTab(tabName) {
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
                // We might want to trigger a render here if we want to support dynamic re-coloring of moments in the future
                // For now, valid moment data is static base64
                renderView();
            } else {
                // DATA MISSING -> Show Overlay
                elements.imgElement.style.display = 'none';
                if (elements.recalcOverlay) elements.recalcOverlay.style.display = 'flex';
            }
        }
    }

    // --- EVENT LISTENERS ---

    // 1. File Upload
    if (elements.fileInput) {
        elements.fileInput.addEventListener('change', () => {
            if (elements.fileInput.files.length > 0) {
                if (elements.fileNameLabel) {
                    elements.fileNameLabel.textContent = elements.fileInput.files[0].name;
                }
                handleUpload();
            }
        });
    }

    // 1b. Mask Upload
    if (elements.maskInput) {
        elements.maskInput.addEventListener('change', () => {
            if (elements.maskInput.files.length > 0) {
                if (elements.maskNameLabel) {
                    elements.maskNameLabel.textContent = elements.maskInput.files[0].name;
                }
                handleMaskUpload();
            }
        });
    }

    // 1c. Invert Mask Toggle
    if (elements.invertMask) {
        elements.invertMask.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }

    // 2. Title Input
    if (elements.plotTitleInput) {
        elements.plotTitleInput.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }

    if (elements.figWidthInput) {
        elements.figWidthInput.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }

    if (elements.figHeightInput) {
        elements.figHeightInput.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }

    // 3. Grid Toggle
    if (elements.gridToggle) {
        elements.gridToggle.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }

    // 3. Beam Toggle
    if (elements.beamToggle) {
        elements.beamToggle.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }

    // 4. Normalization Toggle
    if (elements.normGlobalToggle) {
        elements.normGlobalToggle.addEventListener('change', () => {
            const isChecked = elements.normGlobalToggle.checked;
            if (elements.vminInput) elements.vminInput.disabled = isChecked;
            if (elements.vmaxInput) elements.vmaxInput.disabled = isChecked;
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }

    // Manual Scale Inputs
    if (elements.vminInput) {
        elements.vminInput.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }
    if (elements.vmaxInput) {
        elements.vmaxInput.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }

    // 5. Colorbar Unit
    if (elements.cbarUnit) {
        elements.cbarUnit.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }

    // 4. Center Toggle
    if (elements.centerToggle) {
        elements.centerToggle.addEventListener('change', () => {
            const active = elements.centerToggle.checked;
            elements.centerXInput.disabled = !active;
            elements.centerYInput.disabled = !active;
            if (elements.offsetToggle) {
                elements.offsetToggle.disabled = !active;
                if (!active) elements.offsetToggle.checked = false;
                if (elements.offsetUnit) {
                    elements.offsetUnit.disabled = !active || !elements.offsetToggle.checked;
                }
            }

            // Physical toggle only active if Center is active
            if (elements.physicalToggle) {
                elements.physicalToggle.disabled = !active;
                if (!active) elements.physicalToggle.checked = false;

                // Update distance input and unit state based on toggle state
                const physicalActive = elements.physicalToggle.checked && !elements.physicalToggle.disabled;
                if (elements.distanceInput) {
                    elements.distanceInput.disabled = !physicalActive;
                }
                if (elements.distanceUnit) {
                    elements.distanceUnit.disabled = !physicalActive;
                }
            }

            if (active) {
                elements.centerInputsContainer.classList.add('active');
            } else {
                elements.centerInputsContainer.classList.remove('active');
            }

            renderView(state.lastRenderedChannel);
        });
    }

    // 5. Center Inputs
    if (elements.centerXInput) {
        elements.centerXInput.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
        elements.centerYInput.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }

    // Offset Toggle
    if (elements.offsetToggle) {
        elements.offsetToggle.addEventListener('change', () => {
            if (elements.offsetUnit) {
                elements.offsetUnit.disabled = !elements.offsetToggle.checked;
            }
            renderView(state.lastRenderedChannel);
        });
    }

    // Offset Unit
    if (elements.offsetUnit) {
        elements.offsetUnit.addEventListener('change', () => {
            updateStateFromUI();
            renderView(state.lastRenderedChannel);
        });
    }

    // 6. Physical Toggle
    if (elements.physicalToggle) {
        elements.physicalToggle.addEventListener('change', () => {
            const active = elements.physicalToggle.checked && !elements.physicalToggle.disabled;
            if (elements.distanceInput) {
                elements.distanceInput.disabled = !active;
            }
            if (elements.distanceUnit) {
                elements.distanceUnit.disabled = !active;
            }
            renderView(state.lastRenderedChannel);
        });
    }

    // 7. Distance Input & Unit
    if (elements.distanceInput) {
        elements.distanceInput.addEventListener('change', () => {
            updateStateFromUI();
            renderView();
        });
    }
    if (elements.distanceUnit) {
        elements.distanceUnit.addEventListener('change', () => {
            updateStateFromUI();
            renderView();
        });
    }

    // 6. Sliders (Drag)
    if (elements.sliderStart && elements.sliderEnd) {
        elements.sliderStart.addEventListener('input', function () {
            slider.updateSliderUI();
            renderView(elements.sliderStart.value);
        });

        elements.sliderEnd.addEventListener('input', function () {
            slider.updateSliderUI();
            renderView(elements.sliderEnd.value);
        });
    }

    // 5. Sliders (Manual Input)
    if (elements.valStart && elements.valEnd) {
        elements.valStart.addEventListener('change', function () {
            const values = slider.validateInputValues(true);
            renderView(values.start);
        });

        elements.valEnd.addEventListener('change', function () {
            const values = slider.validateInputValues(false);
            renderView(values.end);
        });
    }

    // 6. Steppers
    if (elements.btnStartUp) {
        elements.btnStartUp.addEventListener('click', () => {
            elements.valStart.value = parseInt(elements.valStart.value) + 1;
            const values = slider.validateInputValues(true);
            renderView(values.start);
        });
        elements.btnStartDown.addEventListener('click', () => {
            elements.valStart.value = parseInt(elements.valStart.value) - 1;
            const values = slider.validateInputValues(true);
            renderView(values.start);
        });
        elements.btnEndUp.addEventListener('click', () => {
            elements.valEnd.value = parseInt(elements.valEnd.value) + 1;
            const values = slider.validateInputValues(false);
            renderView(values.end);
        });
        elements.btnEndDown.addEventListener('click', () => {
            elements.valEnd.value = parseInt(elements.valEnd.value) - 1;
            const values = slider.validateInputValues(false);
            renderView(values.end);
        });
    }

    // 7. Moment Calculation
    if (elements.calculateMomentsBtn) {
        elements.calculateMomentsBtn.addEventListener('click', async () => {
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
        });
    }

    // 8. Tabs
    if (elements.tabItems) {
        elements.tabItems.forEach(tab => {
            tab.addEventListener('click', () => {
                const tabName = tab.dataset.tab;
                switchTab(tabName);
            });

            const closeBtn = tab.querySelector('.tab-close');
            if (closeBtn) {
                closeBtn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const tabName = tab.dataset.tab;
                    const key = tabName.replace('mom', '');

                    delete state.momentImages[key];
                    tab.classList.add('hidden');

                    if (state.activeTab === tabName) {
                        switchTab('cube');
                    }
                });
            }
        });
    }

    // 9. Recalculate Overlay Button
    if (elements.recalcBtn) {
        elements.recalcBtn.addEventListener('click', () => {
            // Trigger the main calculate button
            if (elements.calculateMomentsBtn) {
                elements.calculateMomentsBtn.click();
            }
        });
    }

    // --- HELPER FUNCTIONS ---

    async function handleUpload() {
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

    async function handleMaskUpload() {
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
                // Notify user to recalculate moments if they want them masked
            }
        } catch (error) {
            console.error('Mask Upload Error:', error);
            alert("Mask upload failed.");
        } finally {
            elements.spinner.style.display = 'none';
        }
    }

    // 9. Export
    if (elements.exportLinks) {
        elements.exportLinks.forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const fmt = link.dataset.fmt;
                handleExport(fmt);
            });
        });
    }

    // 10. Workspace Persistence
    if (elements.saveWorkspaceBtn) {
        elements.saveWorkspaceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            saveWorkspace();
        });
    }

    if (elements.loadWorkspaceBtn) {
        elements.loadWorkspaceBtn.addEventListener('click', (e) => {
            e.preventDefault();
            if (elements.workspaceInput) elements.workspaceInput.click();
        });
    }

    if (elements.workspaceInput) {
        elements.workspaceInput.addEventListener('change', (e) => {
            if (elements.workspaceInput.files.length > 0) {
                loadWorkspace(elements.workspaceInput.files[0]);
                elements.workspaceInput.value = ''; // Reset
            }
        });
    }

    function saveWorkspace() {
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

    function loadWorkspace(file) {
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
                        // We can still try to restore settings, but they might be for the wrong file.
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

                // Force update UI for current tab
                // If we auto-loaded, setFileData acts as a reset, so we might need to re-apply settings for the active tab.
                // setFileData resets tabSettings? No, it looks like it might not.
                // Wait, main.js usually resets state on upload.
                // Let's check setFileData implementation.

                // If setFileData clears state, we need to apply settings AFTER it.
                // Fortunately we called setFileData BEFORE restoring state.tabSettings line above.

                // Trigger a render for the active tab to reflect settings
                if (state.activeTab === 'cube') {
                    // We need to apply settings from tabSettings['cube'] to the inputs
                    // Because renderView reads from INPUTS usually, or does it?
                    // getRenderParams reads from DOM.
                    // We need a function to 'applySettingsToDOM(settings)'.

                    // Currently we don't have that. The sliders update 'state' when moved?
                    // No, main.js logic is: DOM -> getRenderParams -> API.
                    // If we overwrite DOM values, then call render, it works.

                    // We need a helper to fill DOM from tabSettings.
                }

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

    async function handleExport(fmt) {
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
                const data = await response.json();
                alert("Export Failed: " + (data.error || "Unknown Error"));
            }
        } catch (err) {
            console.error("Export Error:", err);
            alert("Export Failed.");
        } finally {
            elements.spinner.style.display = 'none';
        }
    }
});