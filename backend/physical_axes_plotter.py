import numpy as np
from astropy import units as u
from astropy.wcs.utils import proj_plane_pixel_scales

def draw_physical_axes(ax, wcs_2d, show_physical, show_center,
                       center_x, center_y, distance_val, distance_unit):
    if not (show_physical and show_center and center_x is not None and center_y is not None and distance_val):
        return

    try:
        cx_pix, cy_pix = float(center_x), float(center_y)
        # Distance is always assumed to be in pc per user request
        d_pc = float(distance_val) * u.pc

        # proj_plane_pixel_scales returns [deg/pix, deg/pix]
        pixscale_deg = proj_plane_pixel_scales(wcs_2d)

        # Scale per pixel in target distance unit (pc, kpc, Mpc)
        # Small angle formula: s = Distance * theta_rad
        target_unit = u.Unit(distance_unit)
        upp_x = ((pixscale_deg[0] * u.deg).to(u.rad).value * d_pc).to(target_unit).value
        upp_y = ((pixscale_deg[1] * u.deg).to(u.rad).value * d_pc).to(target_unit).value

        def pix2phys_x(pix):
            p = np.asarray(pix, dtype=float)
            return (p - cx_pix) * upp_x

        def phys2pix_x(phys):
            v = np.asarray(phys, dtype=float)
            return cx_pix + v / upp_x

        def pix2phys_y(pix):
            p = np.asarray(pix, dtype=float)
            return (p - cy_pix) * upp_y

        def phys2pix_y(phys):
            v = np.asarray(phys, dtype=float)
            return cy_pix + v / upp_y

        ax_top = ax.secondary_xaxis("top", functions=(pix2phys_x, phys2pix_x))
        ax_top.set_xlabel(rf"$\Delta x$ [{distance_unit}]", labelpad=15)

        ax_right = ax.secondary_yaxis("right", functions=(pix2phys_y, phys2pix_y))
        ax_right.set_ylabel(rf"$\Delta y$ [{distance_unit}]", rotation=270, labelpad=15)

        if hasattr(ax, "coords"):
            ax.coords[0].set_ticks_position("b")
            ax.coords[0].set_axislabel_position("b")
            ax.coords[1].set_ticks_position("l")
            ax.coords[1].set_axislabel_position("l")

    except Exception as e:
        print(f"Error adding physical axes: {e}")
