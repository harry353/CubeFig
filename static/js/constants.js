import { elements } from './dom.js';
import * as slider from './slider.js';

export function getDefaultSettings() {
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
