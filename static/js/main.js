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
            cbarUnit: elements.cbarUnit ? elements.cbarUnit.value : 'None'
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
        if (elements.normGlobalToggle) elements.normGlobalToggle.checked = s.normGlobal;
        if (elements.cbarUnit) elements.cbarUnit.value = s.cbarUnit;

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

        // Trigger a re-render for the newly active view to ensure it reflects current global settings
        renderView();
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

    // 2. Title Input
    if (elements.plotTitleInput) {
        elements.plotTitleInput.addEventListener('change', () => {
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
});