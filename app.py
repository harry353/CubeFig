from flask import Flask, render_template, request, jsonify
from backend.fits_handler import state
from backend.plotter import create_plot
from backend.moments.handler import handle_moment_calculation
import argparse
import json

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
args, unknown = parser.parse_known_args()

# Pre-load file if specified
if args.file:
    print(f"Loading initial file: {args.file}")
    state.load_fits_from_path(args.file)

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
    'normGlobal': args.normalize,
    'cbarUnit': args.cbar_unit,
    'showOffset': args.show_offset,
    'offsetAngleUnit': args.offset_angle_unit,
    'startChan': args.start_chan if args.start_chan is not None else '',
    'endChan': args.end_chan if args.end_chan is not None else ''
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
            'channels': state.data.shape[0]
        })
    return jsonify({'is_loaded': False})

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
    cbar_unit = req_data.get('cbarUnit', 'None')
    show_offset = req_data.get('showOffset', False)
    offset_angle_unit = req_data.get('offsetAngleUnit', 'arcsec')

    image_slice = state.get_slice(channel_idx)
    
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
                             cbar_unit=cbar_unit,
                             show_offset=show_offset,
                             offset_angle_unit=offset_angle_unit)
    
    return jsonify({'image': img_base64})

@app.route('/calculate_moments', methods=['POST'])
def calculate_moments():
    req_data = request.get_json()
    images = handle_moment_calculation(state, req_data)
    
    if images is None:
        return jsonify({'error': 'No file loaded'}), 400
            
    return jsonify({'images': images})

if __name__ == '__main__':
    app.run(debug=True, port=5000)