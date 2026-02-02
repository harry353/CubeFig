import io
import base64
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from astropy.visualization import ZScaleInterval
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

def create_plot(image_data, wcs, unit_label, title="", grid=False, beam=None, show_beam=False):
    try:
        # --- DEBUG PRINT ---
        print(f"DEBUG: Grid Requested = {grid}")
        
        wcs_2d = wcs.celestial

        fig = plt.figure(figsize=(8, 8))
        ax = plt.subplot(projection=wcs_2d)
        
        # Plot Data
        interval = ZScaleInterval()
        vmin, vmax = interval.get_limits(image_data)
        im = ax.imshow(image_data, origin='lower', cmap='viridis', vmin=vmin, vmax=vmax)
        
        # --- GRIDLINES FIX ---
        if grid:
            ax.coords.grid(True, ls='dotted')

        # --- BEAM INFO ---
        if show_beam:
            draw_beam(ax, wcs_2d, beam, image_data.shape)

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
        cbar = plt.colorbar(im, ax=ax, fraction=0.046, pad=0.04)
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