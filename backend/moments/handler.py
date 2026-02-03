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
    fig_width = float(req_data.get('figWidth', 8))
    fig_height = float(req_data.get('figHeight', 8))
    invert_mask = req_data.get('invertMask', False)

    # Step 1: Calculate raw moment data
    results = compute_moments(state.data, state.wcs, state.unit, start_chan, end_chan, requested_moments, mask=state.mask, invert_mask=invert_mask)
    
    # Step 2: Render results to base64 images
    images = {}
    for mom in requested_moments:
        if mom in results:
            mom_data = results[mom]
            raw_unit = results.get(f"{mom}_unit", "Arbitrary Units")
            
            # Store raw data for future interactive re-renders
            state.moment_data[mom] = {
                'data': mom_data,
                'unit': raw_unit
            }

            # Formatting title
            mom_title = f"{title}\nMoment {mom}" if title else f"Moment {mom}"

            # Dimensions
            fig_width = float(req_data.get('figWidth', 8))
            fig_height = float(req_data.get('figHeight', 8))

            # Custom Label for Colorbar
            # Custom Label for Colorbar
            cbar_label = "Intensity"
            if mom == '1':
                cbar_label = "Velocity Field"
            elif mom == '2':
                cbar_label = "Velocity Dispersion"
            
            # Extract Manual Vmin/Vmax
            user_vmin = req_data.get('vmin')
            user_vmax = req_data.get('vmax')

            img_base64 = create_plot(
                mom_data, state.wcs, raw_unit, 
                title=mom_title, grid=grid, beam=state.beam, 
                show_beam=show_beam, show_center=show_center,
                center_x=center_x, center_y=center_y,
                show_physical=show_physical, distance_val=distance_val,
                distance_unit=distance_unit,
                cbar_unit=cbar_unit,
                show_offset=show_offset,
                offset_angle_unit=offset_angle_unit,
                fig_width=fig_width, fig_height=fig_height,
                cbar_label=cbar_label,
                user_vmin=user_vmin, user_vmax=user_vmax
            )
            images[mom] = img_base64
            
    return images
