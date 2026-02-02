from flask import Flask, render_template, request, jsonify
from backend.fits_handler import state
from backend.plotter import create_plot

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

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

    image_slice = state.get_slice(channel_idx)
    
    # Pass title, grid, beam, and center to plotter
    img_base64 = create_plot(image_slice, state.wcs, state.unit, 
                             title=title, grid=grid, beam=state.beam, 
                             show_beam=show_beam, show_center=show_center,
                             center_x=center_x, center_y=center_y)
    
    return jsonify({'image': img_base64})

if __name__ == '__main__':
    app.run(debug=True, port=5000)