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
                norm_global=False, global_min=None, global_max=None,
                user_vmin=None, user_vmax=None,
                cbar_unit='None', show_offset=False, offset_angle_unit='arcsec',
                fig_width=8, fig_height=8, cbar_label=None,
                fmt='png', return_base64=True):
    try:
        # --- DEBUG PRINT ---
        print(f"DEBUG: Grid Requested = {grid}")
        
        wcs_2d = wcs.celestial
        fig = plt.figure(figsize=(fig_width, fig_height))

        if show_offset and center_x is not None and center_y is not None:
            # Shift WCS to be a relative offset from center
            wcs_axes = wcs_2d.deepcopy()
            try:
                # Set reference pixel to center (FITS is 1-indexed)
                wcs_axes.wcs.crpix = [float(center_x) + 1, float(center_y) + 1]
                # Set reference value to 0,0
                wcs_axes.wcs.crval = [0, 0]
                
                # Change CTYPE to generic linear to allow arbitrary scaling without RA/Dec limits
                wcs_axes.wcs.ctype = ["LINEAR", "LINEAR"]
                
                # Scaling factor (1 deg = 3600 arcsec, or 3,600,000 mas)
                if offset_angle_unit == 'milliarcsec':
                    angle_multiplier = 3600.0 * 1000.0
                    unit_str = 'mas'
                else:
                    angle_multiplier = 3600.0
                    unit_str = 'arcsec'

                if hasattr(wcs_axes.wcs, 'cdelt'):
                    wcs_axes.wcs.cdelt = [d * angle_multiplier for d in wcs_axes.wcs.cdelt]
                if hasattr(wcs_axes.wcs, 'cd'):
                    wcs_axes.wcs.cd = wcs_axes.wcs.cd * angle_multiplier
                    
                ax = plt.subplot(projection=wcs_axes)
                # No special formatter needed for LINEAR, defaults to decimal
                
                ax.set_xlabel(rf'$\Delta$ RA [{unit_str}]')
                ax.set_ylabel(rf'$\Delta$ Dec [{unit_str}]')
            except Exception as e:
                print(f"Error creating offset WCS: {e}")
                ax = plt.subplot(projection=wcs_2d)
                ax.set_xlabel('Right Ascension [J2000]')
                ax.set_ylabel('Declination [J2000]')
        else:
            ax = plt.subplot(projection=wcs_2d)
            ax.set_xlabel('Right Ascension [J2000]')
            ax.set_ylabel('Declination [J2000]')
        
        # --- INTENSITY SCALING ---
        scale_factor = 1.0
        unit_prefix = ""
        if cbar_unit == 'milli':
            scale_factor = 1e3
            unit_prefix = "m"
        elif cbar_unit == 'micro':
            scale_factor = 1e6
            unit_prefix = r"$\mu$"
        elif cbar_unit == 'nano':
            scale_factor = 1e9
            unit_prefix = "n"

        # Apply scaling to data for plotting purposes
        plot_data = image_data * scale_factor
        scaled_min = (global_min * scale_factor) if global_min is not None else None
        scaled_max = (global_max * scale_factor) if global_max is not None else None
        
        # Adjust unit label
        # Example: Jy/beam -> mJy/beam
        final_unit_label = f"{unit_prefix}{unit_label}"

        # Plot Data
        # Plot Data
        # Determine Default Scaling (Base)
        # Priority: Global Normalization > ZScale (Auto)
        if norm_global and scaled_min is not None and scaled_max is not None:
             vmin, vmax = scaled_min, scaled_max
        else:
            # ZScale Fallback
            if np.any(np.isfinite(plot_data)):
                interval = ZScaleInterval()
                vmin, vmax = interval.get_limits(plot_data)
            else:
                vmin, vmax = 0, 1 # Default for empty/NaN data

        # Apply User Overrides (Partial or Full)
        if user_vmin is not None and str(user_vmin).strip() != "":
            try:
                vmin = float(user_vmin)
            except ValueError:
                pass
                
        if user_vmax is not None and str(user_vmax).strip() != "":
            try:
                vmax = float(user_vmax)
            except ValueError:
                pass
            
        im = ax.imshow(plot_data, origin='lower', cmap='viridis', vmin=vmin, vmax=vmax)
        
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

        # Standard Labels (already handled above if offset)
        # ax.set_xlabel('Right Ascension [J2000]')
        # ax.set_ylabel('Declination [J2000]')

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
        if not (final_unit_label.startswith('[') and final_unit_label.endswith(']')):
            final_unit_label = f"[{final_unit_label}]"
        cbar.set_label(f'{cbar_label} {final_unit_label}', rotation=270, labelpad=20)

        # Save
        # Save
        buf = io.BytesIO()
        plt.savefig(buf, format=fmt, dpi=150, bbox_inches='tight', pad_inches=0.05)
        buf.seek(0)
        plt.close(fig)

        if return_base64:
            return base64.b64encode(buf.getvalue()).decode('utf-8')
        else:
            return buf

    except Exception as e:
        print(f"Plotting Error: {e}")
        import traceback
        traceback.print_exc()
        raise e