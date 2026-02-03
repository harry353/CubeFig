from flask import Flask, render_template, request, jsonify, send_file
from backend.fits_handler import state
from backend.plotter import create_plot
from backend.moments.handler import handle_moment_calculation
import argparse
import json
import numpy as np

app = Flask(__name__)

# Parse command line arguments
parser = argparse.ArgumentParser(description='CubeFig2 - FITS Cube Viewer')
parser.add_argument('--file', type=str, help='Path to FITS file to load')
parser.add_argument('--title', type=str, default='', help='Default plot title')
parser.add_argument('--show-grid', action='store_true', help='Enable grid by default')
parser.add_argument('--show-beam', action='store_true', help='Show beam by default')
parser.add_argument('--show-center', action='store_true', help='Show center by default')
parser.add_argument('--center-coords', type=float, nargs=2, help='Initial center coordinates (X Y)')
parser.add_argument('--show-physical', action='store_true', help='Enable physical axes by default')
parser.add_argument('--target-distance', type=float, help='Target distance')
parser.add_argument('--offset-unit', type=str, default='Mpc', choices=['pc', 'kpc', 'Mpc'], help='Distance unit')
parser.add_argument('--cbar-unit', type=str, default='None', choices=['None', 'milli', 'micro', 'nano'], help='Colorbar unit scale')
parser.add_argument('--normalize', action='store_true', help='Use global normalization')
parser.add_argument('--show-offset', action='store_true', help='Show coordinate offsets from center')
parser.add_argument('--offset-angle-unit', type=str, default='arcsec', choices=['arcsec', 'milliarcsec'], help='Angle offset unit')
parser.add_argument('--start-chan', type=int, help='Initial start channel')
parser.add_argument('--end-chan', type=int, help='Initial end channel')
parser.add_argument('--vmin', type=float, help='Manual min scale')
parser.add_argument('--vmax', type=float, help='Manual max scale')
parser.add_argument('--mask', type=str, help='Path to mask file')
parser.add_argument('--fig-width', type=float, default=8, help='Figure width')
parser.add_argument('--fig-height', type=float, default=8, help='Figure height')
args, unknown = parser.parse_known_args()

# Pre-load file if specified
if args.file:
    print(f"Loading initial file: {args.file}")
    state.load_fits_from_path(args.file)

if args.mask:
    print(f"Loading initial mask: {args.mask}")
    try:
        state.load_mask_from_path(args.mask)
    except Exception as e:
        print(f"Error loading initial mask: {e}")

# Initial state from CLI
initial_config = {
    'title': args.title,
    'grid': args.show_grid,
    'showBeam': args.show_beam,
    'showCenter': args.show_center,
    'centerX': args.center_coords[0] if args.center_coords and len(args.center_coords) > 0 else '',
    'centerY': args.center_coords[1] if args.center_coords and len(args.center_coords) > 1 else '',
    'showPhysical': args.show_physical,
    'distanceVal': args.target_distance if args.target_distance is not None else '',
    'distanceUnit': args.offset_unit,
    'filename': state.filename if state.filename else '',
    'mask_filename': state.mask_filename if state.mask_filename else '',
    'normGlobal': args.normalize,
    'cbarUnit': args.cbar_unit,
    'showOffset': args.show_offset,
    'offsetAngleUnit': args.offset_angle_unit,
    'startChan': args.start_chan if args.start_chan is not None else '',
    'endChan': args.end_chan if args.end_chan is not None else '',
    'vmin': args.vmin if args.vmin is not None else '',
    'vmax': args.vmax if args.vmax is not None else '',
    'figWidth': args.fig_width,
    'figHeight': args.fig_height
}

@app.route('/')
def index():
    return render_template('index.html', config=initial_config)

@app.route('/status')
def get_status():
    if state.data is not None:
        return jsonify({
            'is_loaded': True,
            'filename': state.filename,
            'mask_filename': state.mask_filename,
            'file_path': state.file_path,
            'mask_path': state.mask_path,
            'channels': state.data.shape[0]
        })
    return jsonify({'is_loaded': False})

@app.route('/load_from_path', methods=['POST'])
def load_from_path_route():
    req_data = request.get_json()
    file_path = req_data.get('file_path')
    mask_path = req_data.get('mask_path')
    mask_filename = req_data.get('mask_filename')

    if not file_path:
        return jsonify({'error': 'No file path provided'}), 400

    result = state.load_fits_from_path(file_path)
    if "error" in result:
        return jsonify(result), 500

    # Try to load mask
    target_mask_path = mask_path
    
    # If no explicit mask path, try to resolve relative to file_path
    if not target_mask_path and mask_filename:
        import os
        possible_path = os.path.join(os.path.dirname(file_path), mask_filename)
        if os.path.exists(possible_path):
            target_mask_path = possible_path
            print(f"DEBUG: Resolved mask '{mask_filename}' to '{target_mask_path}'")

    if target_mask_path:
        mask_result = state.load_mask_from_path(target_mask_path)
        if "error" in mask_result:
             # Just warn, don't fail the whole load
            print(f"Warning: Failed to load mask from path {target_mask_path}: {mask_result['error']}")

    # Refresh status to get updated paths/filenames
    return jsonify({
        'success': True,
        'filename': state.filename,
        'file_path': state.file_path,
        'mask_filename': state.mask_filename,
        'mask_path': state.mask_path,
        'channels': state.data.shape[0] if state.data is not None else 0
    })

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    result = state.load_fits(file)
    if "error" in result:
        return jsonify(result), 500
        
    return jsonify(result)

@app.route('/upload_mask', methods=['POST'])
def upload_mask():
    if 'file' not in request.files:
        return jsonify({'error': 'No file part'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400

    result = state.load_mask(file)
    if "error" in result:
        return jsonify(result), 500
        
    return jsonify(result)

@app.route('/render', methods=['POST'])
def render_channel():
    if state.data is None:
        return jsonify({'error': 'No data loaded'}), 400
        
    req_data = request.get_json()
    channel_idx = int(req_data.get('channel', 0))
    
    # Get Title, Grid, and Beam from request
    title = req_data.get('title', '')
    grid = req_data.get('grid', False)
    show_beam = req_data.get('showBeam', False)
    show_center = req_data.get('showCenter', False)
    center_x = req_data.get('centerX')
    center_y = req_data.get('centerY')
    show_physical = req_data.get('showPhysical', False)
    distance_val = req_data.get('distanceVal')
    distance_unit = req_data.get('distanceUnit', 'Mpc')
    norm_global = req_data.get('normGlobal', False)
    user_vmin = req_data.get('vmin')
    user_vmax = req_data.get('vmax')
    cbar_unit = req_data.get('cbarUnit', 'None')
    show_offset = req_data.get('showOffset', False)
    offset_angle_unit = req_data.get('offsetAngleUnit', 'arcsec')
    fig_width = float(req_data.get('figWidth', 8))
    fig_height = float(req_data.get('figHeight', 8))

    invert_mask = req_data.get('invertMask', False)
    
    image_slice = state.get_slice(channel_idx)
    
    # Apply mask if it exists
    if state.mask is not None:
        mask_slice = state.mask[channel_idx, :, :]
        # Decide which pixels to keep
        if invert_mask:
            # Keep where mask <= 0 or NaN (treating NaN as 0/masked in original)
            keep = np.logical_or(mask_slice <= 0, np.isnan(mask_slice))
        else:
            # Keep where mask > 0 and not NaN
            keep = np.where(mask_slice > 0, True, False)
        
        image_slice = np.where(keep, image_slice, np.nan)
        print(f"DEBUG: Mask applied to channel {channel_idx} (Invert={invert_mask}). Finite values remaining: {np.sum(np.isfinite(image_slice))}")

    # Pass title, grid, beam, center, and physical axes to plotter
    img_base64 = create_plot(image_slice, state.wcs, state.unit, 
                             title=title, grid=grid, beam=state.beam, 
                             show_beam=show_beam, show_center=show_center,
                             center_x=center_x, center_y=center_y,
                             show_physical=show_physical, distance_val=distance_val,
                             distance_unit=distance_unit,
                             norm_global=norm_global, 
                             global_min=state.global_min, 
                             global_max=state.global_max,
                             user_vmin=user_vmin,
                             user_vmax=user_vmax,
                             cbar_unit=cbar_unit,
                             show_offset=show_offset,
                             offset_angle_unit=offset_angle_unit,
                             fig_width=fig_width,
                             fig_height=fig_height,
                             cbar_label="Specific Intensity")
    
    return jsonify({'image': img_base64})

@app.route('/calculate_moments', methods=['POST'])
def calculate_moments():
    req_data = request.get_json()
    images = handle_moment_calculation(state, req_data)
    
    if images is None:
        return jsonify({'error': 'No file loaded'}), 400
            
    return jsonify({'images': images})

@app.route('/render_moment', methods=['POST'])
def render_moment():
    req_data = request.get_json()
    mom_type = req_data.get('momentType')
    
    if state.data is None:
        return jsonify({'error': 'No file loaded'}), 400
    
    if mom_type not in state.moment_data:
        return jsonify({'error': 'Moment not calculated yet'}), 400
        
    mom_info = state.moment_data[mom_type]
    mom_data = mom_info['data']
    raw_unit = mom_info['unit']
    mom_unit = raw_unit # Guaranteed to be clean now

    cbar_label = "Intensity"
    if mom_type == '1':
        cbar_label = "Velocity Field"
    elif mom_type == '2':
        cbar_label = "Velocity Dispersion"
    
    # Visualization params
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

    user_vmin = req_data.get('vmin')
    user_vmax = req_data.get('vmax')
    
    mom_title = f"{title}\nMoment {mom_type}" if title else f"Moment {mom_type}"
    
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
        fig_width=fig_width,
        fig_height=fig_height,
        cbar_label=cbar_label,
        user_vmin=user_vmin,
        user_vmax=user_vmax
    )
    
    return jsonify({'image': img_base64})

@app.route('/export', methods=['POST'])
def export_plot():
    if state.data is None:
        return jsonify({'error': 'No data loaded'}), 400
        
    req_data = request.get_json()
    export_fmt = req_data.get('format', 'png')
    
    # Common visualisation params
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
    user_vmin = req_data.get('vmin')
    user_vmax = req_data.get('vmax')
    
    # Check if Moment or Cube
    if 'momentType' in req_data:
        # --- MOMENT EXPORT ---
        mom_type = req_data.get('momentType')
        if mom_type not in state.moment_data:
            return jsonify({'error': 'Moment not calculated'}), 400
            
        mom_info = state.moment_data[mom_type]
        plot_data = mom_info['data']
        unit = mom_info['unit']
        
        final_title = f"{title}\nMoment {mom_type}" if title else f"Moment {mom_type}"
        cbar_label = "Intensity"
        if mom_type == '1': cbar_label = "Velocity Field"
        elif mom_type == '2': cbar_label = "Velocity Dispersion"
        
        buf = create_plot(
            plot_data, state.wcs, unit,
            title=final_title, grid=grid, beam=state.beam,
            show_beam=show_beam, show_center=show_center,
            center_x=center_x, center_y=center_y,
            show_physical=show_physical, distance_val=distance_val,
            distance_unit=distance_unit,
            cbar_unit=cbar_unit,
            show_offset=show_offset,
            offset_angle_unit=offset_angle_unit,
            fig_width=fig_width,
            fig_height=fig_height,
            cbar_label=cbar_label,
            user_vmin=user_vmin,
            user_vmax=user_vmax,
            fmt=export_fmt,
            return_base64=False
        )
        
    else:
        # --- CUBE EXPORT ---
        channel_idx = int(req_data.get('channel', 0))
        norm_global = req_data.get('normGlobal', False)
        invert_mask = req_data.get('invertMask', False)
        
        image_slice = state.get_slice(channel_idx)
        
        # Apply mask logic (duplicated from /render)
        if state.mask is not None:
            mask_slice = state.mask[channel_idx, :, :]
            if invert_mask:
                keep = np.logical_or(mask_slice <= 0, np.isnan(mask_slice))
            else:
                keep = np.where(mask_slice > 0, True, False)
            image_slice = np.where(keep, image_slice, np.nan)

        buf = create_plot(
            image_slice, state.wcs, state.unit, 
            title=title, grid=grid, beam=state.beam, 
            show_beam=show_beam, show_center=show_center,
            center_x=center_x, center_y=center_y,
            show_physical=show_physical, distance_val=distance_val,
            distance_unit=distance_unit,
            norm_global=norm_global, 
            global_min=state.global_min, 
            global_max=state.global_max,
            user_vmin=user_vmin,
            user_vmax=user_vmax,
            cbar_unit=cbar_unit,
            show_offset=show_offset,
            offset_angle_unit=offset_angle_unit,
            fig_width=fig_width,
            fig_height=fig_height,
            cbar_label="Specific Intensity",
            fmt=export_fmt,
            return_base64=False
        )

    return send_file(
        buf, 
        mimetype=f'image/{export_fmt}', 
        as_attachment=True, 
        download_name=f'plot.{export_fmt}'
    )

if __name__ == '__main__':
    app.run(debug=True, port=5000)