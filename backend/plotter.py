import numpy as np
import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from astropy.visualization import ZScaleInterval
from mpl_toolkits.axes_grid1 import make_axes_locatable
from .physical_axes_plotter import draw_physical_axes
from .beam_plotter import draw_beam

# Global LaTeX settings
plt.rcParams.update({
    "text.usetex": True,
    "font.family": "serif",
    "font.serif": ["Computer Modern Roman"],
    "font.size": 12,
    "axes.labelsize": 12,
    "legend.fontsize": 10,
    "xtick.labelsize": 10,
    "ytick.labelsize": 10,
})

def create_plot(image_data, wcs, unit_label, title="", grid=False, beam=None, show_beam=False,
                show_center=False, center_x=None, center_y=None,
                show_physical=False, distance_val=None, distance_unit='Mpc',
                norm_global=False, global_min=None, global_max=None):
    try:
        # --- DEBUG PRINT ---
        print(f"DEBUG: Grid Requested = {grid}")
        
        wcs_2d = wcs.celestial

        fig = plt.figure(figsize=(8, 8))
        ax = plt.subplot(projection=wcs_2d)
        
        # Plot Data
        if norm_global and global_min is not None and global_max is not None:
            vmin, vmax = global_min, global_max
        else:
            interval = ZScaleInterval()
            vmin, vmax = interval.get_limits(image_data)
            
        im = ax.imshow(image_data, origin='lower', cmap='viridis', vmin=vmin, vmax=vmax)
        
        # --- GRIDLINES FIX ---
        if grid:
            ax.coords.grid(True, ls='dotted')

        # --- BEAM INFO ---
        if show_beam:
            draw_beam(ax, wcs_2d, beam, image_data.shape)

        # --- CENTER MARKER ---
        if show_center and center_x is not None and center_y is not None:
            try:
                cx, cy = float(center_x), float(center_y)
                # Red star with black outline
                ax.plot(cx, cy, marker='*', color='red', markersize=12, 
                        markeredgecolor='black', markeredgewidth=1)
            except Exception as e:
                print(f"Error drawing center marker: {e}")

        # --- PHYSICAL AXES ---
        draw_physical_axes(ax, wcs_2d, show_physical, show_center, center_x, center_y, distance_val, distance_unit)

        # --- TITLE ---
        if title:
            ax.set_title(title, pad=15, fontsize=14)

        # --- Coordinates Definitions ---
        try:
            ra = ax.coords['ra']
        except:
            ra = ax.coords[0]

        try:
            dec = ax.coords['dec']
        except:
            dec = ax.coords[1]

        # Standard Labels
        ax.set_xlabel('Right Ascension [J2000]')
        ax.set_ylabel('Declination [J2000]')

        # Styling
        ax.tick_params(direction='out', color='black')

        # Colorbar
        divider = make_axes_locatable(ax)
        cbar_pad = 0.85 if (show_physical and show_center and center_x is not None) else 0.25
        # Use standard Axes class to avoid FITS/WCSAxes tick limitations
        cax = divider.append_axes("right", size="5%", pad=cbar_pad, axes_class=plt.Axes)
        cbar = plt.colorbar(im, cax=cax)
        cax.tick_params(axis='x', which='both', bottom=False, top=False)
        cax.tick_params(axis='y', which='both', left=False, right=True)
        if not (unit_label.startswith('[') and unit_label.endswith(']')):
            unit_label = f"[{unit_label}]"
        cbar.set_label(f'Intensity {unit_label}', rotation=270, labelpad=20)

        # Save
        buf = io.BytesIO()
        plt.savefig(buf, format='png', dpi=150, bbox_inches='tight', pad_inches=0.5)
        buf.seek(0)
        plt.close(fig)

        return base64.b64encode(buf.getvalue()).decode('utf-8')

    except Exception as e:
        print(f"Plotting Error: {e}")
        import traceback
        traceback.print_exc()
        raise e