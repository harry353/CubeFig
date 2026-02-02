// static/js/dom.js

export const elements = {
    // We use 'get' functions so it looks for the element freshly every time we ask for it
    get fileInput() { return document.getElementById('fileInput'); },
    get fileNameLabel() { return document.getElementById('fileNameLabel'); },
    get sliderContainer() { return document.getElementById('sliderContainer'); },
    get imgElement() { return document.getElementById('fits-image'); },
    get spinner() { return document.getElementById('loadingSpinner'); },

    // Slider Inputs
    get sliderStart() { return document.getElementById('sliderStart'); },
    get sliderEnd() { return document.getElementById('sliderEnd'); },
    get valStart() { return document.getElementById('valStart'); },
    get valEnd() { return document.getElementById('valEnd'); },
    get sliderRange() { return document.getElementById('sliderRange'); },

    // Sidebar
    get plotTitleInput() { return document.getElementById('plotTitleInput'); },
    get gridToggle() { return document.getElementById('gridToggle'); },
    get beamToggle() { return document.getElementById('beamToggle'); },

    // Center Marker
    get centerToggle() { return document.getElementById('centerToggle'); },
    get centerXInput() { return document.getElementById('centerX'); },
    get centerYInput() { return document.getElementById('centerY'); },
    get centerInputsContainer() { return document.getElementById('centerInputsContainer'); },

    // Physical Axes
    get physicalToggle() { return document.getElementById('physicalToggle'); },
    get distanceInput() { return document.getElementById('distanceMpc'); },
    get distanceUnit() { return document.getElementById('distanceUnit'); },

    // Stepper Buttons
    get btnStartUp() { return document.getElementById('btnStartUp'); },
    get btnStartDown() { return document.getElementById('btnStartDown'); },
    get btnEndUp() { return document.getElementById('btnEndUp'); },
    get btnEndDown() { return document.getElementById('btnEndDown'); }
};