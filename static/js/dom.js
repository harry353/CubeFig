// static/js/dom.js

export const elements = {
    // We use 'get' functions so it looks for the element freshly every time we ask for it
    get fileInput() { return document.getElementById('fileInput'); },
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

    // Stepper Buttons
    get btnStartUp() { return document.getElementById('btnStartUp'); },
    get btnStartDown() { return document.getElementById('btnStartDown'); },
    get btnEndUp() { return document.getElementById('btnEndUp'); },
    get btnEndDown() { return document.getElementById('btnEndDown'); }
};