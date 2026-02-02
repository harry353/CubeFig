import numpy as np
from matplotlib.patches import Ellipse
from matplotlib.colors import to_rgba
from astropy.wcs.utils import proj_plane_pixel_scales

# --- BEAM DRAWING CONFIGURATION ---
BEAM_EDGE_COLOR = 'black'
BEAM_EDGE_ALPHA = 1.0  # Separate alpha for the border
BEAM_EDGE_WIDTH = 1
BEAM_FILL_COLOR = 'gray'
BEAM_FILL_ALPHA = 0.5
BEAM_AXIS_COLOR = 'black'
BEAM_AXIS_ALPHA = 1  # Separate alpha for the axes
BEAM_AXIS_WIDTH = 1

def draw_beam(ax, wcs_2d, beam, image_shape):
    """
    Draws the synthesized beam ellipse and axes in the lower left corner of the plot.
    """
    if not beam or not beam.get('bmaj'):
        return

    try:
        # Get pixel scales (degrees per pixel)
        scales = proj_plane_pixel_scales(wcs_2d)
        
        # Convert beam to pixels
        bmaj_pix = beam['bmaj'] / scales[1]
        bmin_pix = beam['bmin'] / scales[0]
        bpa = beam['bpa'] # Degrees
        
        # Position: lower left corner
        # Offset by 5% of the image size
        h, w = image_shape
        offset = 0.05 * min(h, w)
        
        # Center of beam ellipse
        bx = offset + bmaj_pix/2
        by = offset + bmaj_pix/2
        
        # Draw main ellipse
        # In Matplotlib Ellipse, angle is CCW from X-axis (+X).
        # We specify width=bmin (on X at angle=0) and height=bmaj (on Y at angle=0).
        # Since Height (Major) is initially North (+Y), angle=0 means BPA=0.
        # Thus, angle=BPA correctly rotates the major axis CCW from North.
        ellipse_angle = bpa
        
        # Use RGBA colors to allow separate alpha control for edge and face
        edge_rgba = to_rgba(BEAM_EDGE_COLOR, BEAM_EDGE_ALPHA)
        face_rgba = to_rgba(BEAM_FILL_COLOR, BEAM_FILL_ALPHA)
        
        beam_ell = Ellipse((bx, by), bmin_pix, bmaj_pix, angle=ellipse_angle,
                          edgecolor=edge_rgba, facecolor=face_rgba, 
                          linewidth=BEAM_EDGE_WIDTH)
        ax.add_patch(beam_ell)
        
        # Draw Primary and Secondary axes
        # BPA=0 is North (+Y), BPA=90 is West (-X), BPA=270 is East (+X)
        # Major axis vector (from center to tip):
        rad_pa = np.radians(bpa)
        # x' = -sin(BPA), y' = cos(BPA)
        dx_maj = -(bmaj_pix/2) * np.sin(rad_pa)
        dy_maj = (bmaj_pix/2) * np.cos(rad_pa)
        
        axis_rgba = to_rgba(BEAM_AXIS_COLOR, BEAM_AXIS_ALPHA)
        ax.plot([bx-dx_maj, bx+dx_maj], [by-dy_maj, by+dy_maj], color=axis_rgba, linewidth=BEAM_AXIS_WIDTH)
        
        # Secondary axis (Minor) - perpendicular to Major
        # x' = cos(BPA), y' = sin(BPA)
        dx_min = (bmin_pix/2) * np.cos(rad_pa)
        dy_min = (bmin_pix/2) * np.sin(rad_pa)
        ax.plot([bx-dx_min, bx+dx_min], [by-dy_min, by+dy_min], color=axis_rgba, linewidth=BEAM_AXIS_WIDTH)
        
    except Exception as beam_err:
        print(f"Warning: Could not draw beam: {beam_err}")
