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
        if (elements.centerXInput) elements.centerXInput.value = c.centerX || '';
        if (elements.centerYInput) elements.centerYInput.value = c.centerY || '';
        if (elements.physicalToggle) {
            elements.physicalToggle.checked = !!c.showPhysical;
            elements.physicalToggle.dispatchEvent(new Event('change'));
        }
        if (elements.distanceInput) elements.distanceInput.value = c.distanceVal || '';
        if (elements.distanceUnit) elements.distanceUnit.value = c.distanceUnit || 'Mpc';

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
                renderChannel(0);
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

        // Default values
        if (elements.sliderStart) elements.sliderStart.value = 0;
        if (elements.sliderEnd) elements.sliderEnd.value = max;

        if (elements.fileNameLabel && data.filename) {
            elements.fileNameLabel.textContent = data.filename;
        }

        slider.updateSliderUI();
    }

    async function renderChannel(index) {
        if (state.isRendering) return;
        state.isRendering = true;
        elements.spinner.style.display = 'block';
        state.lastRenderedChannel = index;

        const title = elements.plotTitleInput ? elements.plotTitleInput.value : '';
        const showGrid = elements.gridToggle ? elements.gridToggle.checked : false;
        const showBeam = elements.beamToggle ? elements.beamToggle.checked : false;
        const showCenter = elements.centerToggle ? elements.centerToggle.checked : false;
        const centerX = elements.centerXInput ? elements.centerXInput.value : '';
        const centerY = elements.centerYInput ? elements.centerYInput.value : '';
        const showPhysical = elements.physicalToggle ? elements.physicalToggle.checked : false;
        const distanceVal = elements.distanceInput ? elements.distanceInput.value : '';
        const distanceUnit = elements.distanceUnit ? elements.distanceUnit.value : 'Mpc';
        const normGlobal = elements.normGlobalToggle ? elements.normGlobalToggle.checked : false;

        try {
            const data = await api.fetchRender({
                channel: index,
                title: title,
                grid: showGrid,
                showBeam: showBeam,
                showCenter: showCenter,
                centerX: centerX,
                centerY: centerY,
                showPhysical: showPhysical,
                distanceVal: distanceVal,
                distanceUnit: distanceUnit,
                normGlobal: normGlobal
            });

            if (data.image) {
                elements.imgElement.src = 'data:image/png;base64,' + data.image;
                elements.imgElement.style.display = 'block';
            }
        } catch (error) {
            console.error("Render Error:", error);
        } finally {
            elements.spinner.style.display = 'none';
            state.isRendering = false;
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

    // 2. Title Input
    if (elements.plotTitleInput) {
        elements.plotTitleInput.addEventListener('change', () => renderChannel(state.lastRenderedChannel));
    }

    // 3. Grid Toggle
    if (elements.gridToggle) {
        elements.gridToggle.addEventListener('change', () => {
            renderChannel(state.lastRenderedChannel);
        });
    }

    // 3. Beam Toggle
    if (elements.beamToggle) {
        elements.beamToggle.addEventListener('change', () => {
            renderChannel(state.lastRenderedChannel);
        });
    }

    // 4. Normalization Toggle
    if (elements.normGlobalToggle) {
        elements.normGlobalToggle.addEventListener('change', () => {
            renderChannel(state.lastRenderedChannel);
        });
    }

    // 4. Center Toggle
    if (elements.centerToggle) {
        elements.centerToggle.addEventListener('change', () => {
            const active = elements.centerToggle.checked;
            elements.centerXInput.disabled = !active;
            elements.centerYInput.disabled = !active;

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

            renderChannel(state.lastRenderedChannel);
        });
    }

    // 5. Center Inputs
    if (elements.centerXInput) {
        elements.centerXInput.addEventListener('change', () => renderChannel(state.lastRenderedChannel));
        elements.centerYInput.addEventListener('change', () => renderChannel(state.lastRenderedChannel));
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
            renderChannel(state.lastRenderedChannel);
        });
    }

    // 7. Distance Input & Unit
    if (elements.distanceInput) {
        elements.distanceInput.addEventListener('change', () => renderChannel(state.lastRenderedChannel));
    }
    if (elements.distanceUnit) {
        elements.distanceUnit.addEventListener('change', () => {
            renderChannel(state.lastRenderedChannel);
        });
    }

    // 6. Sliders (Drag)
    if (elements.sliderStart && elements.sliderEnd) {
        elements.sliderStart.addEventListener('input', function () {
            slider.updateSliderUI();
            renderChannel(elements.sliderStart.value);
        });

        elements.sliderEnd.addEventListener('input', function () {
            slider.updateSliderUI();
            renderChannel(elements.sliderEnd.value);
        });
    }

    // 5. Sliders (Manual Input)
    if (elements.valStart && elements.valEnd) {
        elements.valStart.addEventListener('change', function () {
            const values = slider.validateInputValues(true);
            renderChannel(values.start);
        });

        elements.valEnd.addEventListener('change', function () {
            const values = slider.validateInputValues(false);
            renderChannel(values.end);
        });
    }

    // 6. Steppers
    if (elements.btnStartUp) {
        elements.btnStartUp.addEventListener('click', () => {
            elements.valStart.value = parseInt(elements.valStart.value) + 1;
            const values = slider.validateInputValues(true);
            renderChannel(values.start);
        });
        elements.btnStartDown.addEventListener('click', () => {
            elements.valStart.value = parseInt(elements.valStart.value) - 1;
            const values = slider.validateInputValues(true);
            renderChannel(values.start);
        });
        elements.btnEndUp.addEventListener('click', () => {
            elements.valEnd.value = parseInt(elements.valEnd.value) + 1;
            const values = slider.validateInputValues(false);
            renderChannel(values.end);
        });
        elements.btnEndDown.addEventListener('click', () => {
            elements.valEnd.value = parseInt(elements.valEnd.value) - 1;
            const values = slider.validateInputValues(false);
            renderChannel(values.end);
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
                renderChannel(0);
            }
        } catch (error) {
            console.error('Upload Error:', error);
            alert("Upload failed. Check console for details.");
        } finally {
            elements.spinner.style.display = 'none';
        }
    }
});