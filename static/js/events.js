import { elements } from './dom.js';
import { state } from './state.js';
import * as slider from './slider.js';
import { handleUpload, handleMaskUpload } from './upload.js';
import { updateStateFromUI, initializeUI } from './ui.js';
import { renderView } from './render.js';
import { handleMomentCalculation } from './moments.js';
import { switchTab } from './tabs.js'; // switchTab also handles close logic if we export it or move it there
import { handleExport } from './export.js';
import { saveWorkspace, loadWorkspace } from './workspace.js';
import { getDefaultSettings } from './constants.js'; // Needed for manual reset logic if needed

export function setupEventListeners() {

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
        elements.calculateMomentsBtn.addEventListener('click', handleMomentCalculation);
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

    // Initialize UI on load
    initializeUI();
}
