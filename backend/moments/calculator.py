import numpy as np
import ctypes
import os
import sys

# Load C library
_lib = None
_lib_path = os.path.join(os.path.dirname(__file__), 'cpp', 'moments.so')

try:
    if os.path.exists(_lib_path):
        _lib = ctypes.CDLL(_lib_path)
        # void calculate_moments_c(const float* data, const float* v, int channels, int height, int width, double dv, bool compute0, bool compute1, bool compute2, float* mom0_out, float* mom1_out, float* mom2_out)
        _lib.calculate_moments_c.argtypes = [
            ctypes.POINTER(ctypes.c_float), # data
            ctypes.POINTER(ctypes.c_float), # v
            ctypes.c_int,                  # channels
            ctypes.c_int,                  # height
            ctypes.c_int,                  # width
            ctypes.c_double,               # dv
            ctypes.c_bool,                 # compute0
            ctypes.c_bool,                 # compute1
            ctypes.c_bool,                 # compute2
            ctypes.POINTER(ctypes.c_float), # mom0_out
            ctypes.POINTER(ctypes.c_float), # mom1_out
            ctypes.POINTER(ctypes.c_float)  # mom2_out
        ]
        _lib.calculate_moments_c.restype = None
except Exception as e:
    print(f"Warning: Could not load C library for moments: {e}")
    _lib = None

def compute_moments_python(subset, v, v_unit, bunit, requested_moments):
    """Fallback pure python implementation"""
    results = {}
    dv = abs(v[1] - v[0]) if len(v) > 1 else 1.0
    
    # Calculate Moment 0 (Integrated Intensity)
    sum_i = np.nansum(subset, axis=0)
    if '0' in requested_moments:
        results['0'] = sum_i * dv
        results['0_unit'] = f"{bunit} {v_unit}"

    # Calculate Moment 1 (Velocity Field)
    sum_i_safe = np.where(sum_i == 0, np.nan, sum_i)
    mom1 = np.nansum(subset * v[:, None, None], axis=0) / sum_i_safe
    
    if '1' in requested_moments:
        results['1'] = mom1
        results['1_unit'] = v_unit

    # Calculate Moment 2 (Velocity Dispersion)
    if '2' in requested_moments:
        res_sq = (v[:, None, None] - mom1[None, :, :])**2
        mom2 = np.sqrt(np.nansum(subset * res_sq, axis=0) / sum_i_safe)
        results['2'] = mom2
        results['2_unit'] = v_unit

    return results

def compute_moments(data, wcs, bunit, start_chan, end_chan, requested_moments):
    """
    Calculates moments 0, 1, and 2 for the specified channel range.
    Uses C accelerator if available.
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
        pixel_coords = np.arange(start, end)
        world_coords = spec_wcs.pixel_to_world(pixel_coords)
        
        if hasattr(world_coords, 'to'):
            try:
                v = world_coords.to('km/s', equivalencies=None).value
                v_unit = 'km/s'
            except:
                v = world_coords.value
                v_unit = str(world_coords.unit)
        else:
            v = world_coords.value
            v_unit = str(world_coords.unit)
    except Exception as e:
        print(f"Spectral WCS failed: {e}")
        v = np.arange(start, end)
        v_unit = 'pixels'

    v = v.astype(np.float32)
    dv = float(abs(v[1] - v[0]) if len(v) > 1 else 1.0)
    
    # If C library is available, use it
    if _lib:
        print("INFO: Using C implementation for moment calculation.")
        channels, height, width = subset.shape
        # Prepare arrays for C (must be contiguous and type float32)
        # We need to make sure 'subset' is float32 and contiguous
        subset_c = np.ascontiguousarray(subset, dtype=np.float32)
        v_c = np.ascontiguousarray(v, dtype=np.float32)

        # Allocate output arrays
        m0 = np.zeros((height, width), dtype=np.float32)
        m1 = np.zeros((height, width), dtype=np.float32)
        m2 = np.zeros((height, width), dtype=np.float32)

        try:
            _lib.calculate_moments_c(
                subset_c.ctypes.data_as(ctypes.POINTER(ctypes.c_float)),
                v_c.ctypes.data_as(ctypes.POINTER(ctypes.c_float)),
                channels, height, width, dv,
                '0' in requested_moments,
                '1' in requested_moments,
                '2' in requested_moments,
                m0.ctypes.data_as(ctypes.POINTER(ctypes.c_float)),
                m1.ctypes.data_as(ctypes.POINTER(ctypes.c_float)),
                m2.ctypes.data_as(ctypes.POINTER(ctypes.c_float))
            )

            results = {}
            if '0' in requested_moments:
                results['0'] = m0
                results['0_unit'] = f"{bunit} {v_unit}"
            if '1' in requested_moments:
                results['1'] = m1
                results['1_unit'] = v_unit
            if '2' in requested_moments:
                results['2'] = m2
                results['2_unit'] = v_unit
            return results
        except Exception as e:
            print(f"ERROR: C moment calculation failed, falling back: {e}")
            # Fallback to python happens below

    # Fallback to pure Python
    print("INFO: Using pure Python implementation for moment calculation.")
    return compute_moments_python(subset, v, v_unit, bunit, requested_moments)
