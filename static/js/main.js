import { elements } from './dom.js';
import { state } from './state.js';
import * as api from './api.js';
import * as slider from './slider.js';

document.addEventListener('DOMContentLoaded', () => {

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

        try {
            const data = await api.fetchRender({
                channel: index,
                title: title,
                grid: showGrid,
                showBeam: showBeam,
                showCenter: showCenter,
                centerX: centerX,
                centerY: centerY
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
        elements.fileInput.addEventListener('change', handleUpload);
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

    // 4. Center Toggle
    if (elements.centerToggle) {
        elements.centerToggle.addEventListener('change', () => {
            const active = elements.centerToggle.checked;
            elements.centerXInput.disabled = !active;
            elements.centerYInput.disabled = !active;

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
        if (!elements.fileInput.files[0]) return;

        elements.spinner.style.display = 'block';
        elements.imgElement.style.display = 'none';

        try {
            const data = await api.fetchUpload(elements.fileInput.files[0]);

            if (data.error) {
                alert("Error: " + data.error);
                elements.spinner.style.display = 'none';
                return;
            }

            state.maxChannels = data.channels - 1;

            elements.sliderStart.max = state.maxChannels;
            elements.sliderEnd.max = state.maxChannels;
            elements.valStart.max = state.maxChannels;
            elements.valEnd.max = state.maxChannels;

            elements.sliderStart.value = 0;
            elements.sliderEnd.value = state.maxChannels;

            slider.updateSliderUI();
            elements.sliderContainer.style.display = 'flex';

            renderChannel(0);

        } catch (error) {
            console.error('Upload Error:', error);
            elements.spinner.style.display = 'none';
        }
    }
});