import numpy as np

def compute_moments(data, wcs, bunit, start_chan, end_chan, requested_moments):
    """
    Calculates moments 0, 1, and 2 for the specified channel range.
    Returns a dict of {moment_name: numpy_array}.
    """
    if data is None:
        return {}

    # Ensure range is valid
    start = max(0, int(start_chan))
    end = min(data.shape[0], int(end_chan) + 1)
    
    if start >= end:
        return {}

    subset = data[start:end, :, :]
    
    # Get spectral axis
    try:
        spec_wcs = wcs.spectral
        # Use middle of channel (0.5 offset)? Astro 0-indexed pixel coords
        pixel_coords = np.arange(start, end)
        world_coords = spec_wcs.pixel_to_world(pixel_coords)
        
        # Extract values in a consistent unit (e.g. km/s if possible, or SI)
        if hasattr(world_coords, 'to'):
            # Try velocity first
            try:
                v = world_coords.to('km/s', equivalencies=None).value
                v_unit = 'km/s'
            except:
                # Fallback to whatever world unit (Hz, m, etc)
                v = world_coords.value
                v_unit = str(world_coords.unit)
        else:
            v = world_coords.value
            v_unit = str(world_coords.unit)
    except Exception as e:
        print(f"Spectral WCS failed: {e}")
        v = np.arange(start, end)
        v_unit = 'pixels'

    results = {}
    
    # Calculate Moment 0 (Integrated Intensity)
    # Sum * dv
    dv = abs(v[1] - v[0]) if len(v) > 1 else 1.0
    mom0 = np.nansum(subset, axis=0) * dv
    
    if '0' in requested_moments:
        results['0'] = mom0
        results['0_unit'] = f"{bunit} {v_unit}"

    # Calculate Moment 1 (Velocity Field)
    # Sum(I * v) / Sum(I)
    sum_i = np.nansum(subset, axis=0)
    # Avoid division by zero
    sum_i_safe = np.where(sum_i == 0, np.nan, sum_i)
    
    mom1 = np.nansum(subset * v[:, None, None], axis=0) / sum_i_safe
    
    if '1' in requested_moments:
        results['1'] = mom1
        results['1_unit'] = v_unit

    # Calculate Moment 2 (Velocity Dispersion)
    # sqrt( Sum(I * (v - mom1)^2) / Sum(I) )
    if '2' in requested_moments:
        res_sq = (v[:, None, None] - mom1[None, :, :])**2
        mom2 = np.sqrt(np.nansum(subset * res_sq, axis=0) / sum_i_safe)
        results['2'] = mom2
        results['2_unit'] = v_unit

    return results
