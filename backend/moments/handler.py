from ..plotter import create_plot
from .calculator import compute_moments

def handle_moment_calculation(state, req_data):
    """
    Orchestrates the calculation and rendering of requested moment maps.
    Returns a dictionary of moment names to base64 images.
    """
    if state.data is None:
        return None

    # Extraction of params from request (same as render_channel)
    start_chan = req_data.get('startChan', 0)
    end_chan = req_data.get('endChan', 0)
    requested_moments = req_data.get('moments', [])
    
    title = req_data.get('title', '')
    grid = req_data.get('grid', False)
    show_beam = req_data.get('showBeam', False)
    show_center = req_data.get('showCenter', False)
    center_x = req_data.get('centerX')
    center_y = req_data.get('centerY')
    show_physical = req_data.get('showPhysical', False)
    distance_val = req_data.get('distanceVal')
    distance_unit = req_data.get('distanceUnit', 'Mpc')
    cbar_unit = req_data.get('cbarUnit', 'None')
    show_offset = req_data.get('showOffset', False)
    offset_angle_unit = req_data.get('offsetAngleUnit', 'arcsec')

    # Step 1: Calculate raw moment data
    results = compute_moments(state.data, state.wcs, state.unit, start_chan, end_chan, requested_moments)
    
    # Step 2: Render results to base64 images
    images = {}
    for mom in requested_moments:
        if mom in results:
            mom_data = results[mom]
            mom_unit = results.get(f"{mom}_unit", "Arbitrary Units")
            
            # Formatting title
            mom_title = f"{title}\nMoment {mom}" if title else f"Moment {mom}"
            
            img_base64 = create_plot(
                mom_data, state.wcs, mom_unit, 
                title=mom_title, grid=grid, beam=state.beam, 
                show_beam=show_beam, show_center=show_center,
                center_x=center_x, center_y=center_y,
                show_physical=show_physical, distance_val=distance_val,
                distance_unit=distance_unit,
                cbar_unit=cbar_unit,
                show_offset=show_offset,
                offset_angle_unit=offset_angle_unit
            )
            images[mom] = img_base64
            
    return images
