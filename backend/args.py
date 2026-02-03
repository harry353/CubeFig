import argparse

def parse_arguments():
    """Parses command line arguments for CubeFig2."""
    parser = argparse.ArgumentParser(description='CubeFig2 - FITS Cube Viewer')
    
    # File loading
    parser.add_argument('--file', type=str, help='Path to FITS file to load')
    parser.add_argument('--mask', type=str, help='Path to mask file')
    
    # Plot configuration
    parser.add_argument('--title', type=str, default='', help='Default plot title')
    parser.add_argument('--show-grid', action='store_true', help='Enable grid by default')
    parser.add_argument('--show-beam', action='store_true', help='Show beam by default')
    parser.add_argument('--show-center', action='store_true', help='Show center by default')
    parser.add_argument('--center-coords', type=float, nargs=2, help='Initial center coordinates (X Y)')
    
    # Physical axes
    parser.add_argument('--show-physical', action='store_true', help='Enable physical axes by default')
    parser.add_argument('--target-distance', type=float, help='Target distance')
    parser.add_argument('--offset-unit', type=str, default='Mpc', choices=['pc', 'kpc', 'Mpc'], help='Distance unit')
    
    # Coordinates & Display
    parser.add_argument('--cbar-unit', type=str, default='None', choices=['None', 'milli', 'micro', 'nano'], help='Colorbar unit scale')
    parser.add_argument('--normalize', action='store_true', help='Use global normalization')
    parser.add_argument('--show-offset', action='store_true', help='Show coordinate offsets from center')
    parser.add_argument('--offset-angle-unit', type=str, default='arcsec', choices=['arcsec', 'milliarcsec'], help='Angle offset unit')
    
    # Scaling
    parser.add_argument('--start-chan', type=int, help='Initial start channel')
    parser.add_argument('--end-chan', type=int, help='Initial end channel')
    parser.add_argument('--vmin', type=float, help='Manual min scale')
    parser.add_argument('--vmax', type=float, help='Manual max scale')
    
    # Figure dimensions
    parser.add_argument('--fig-width', type=float, default=8, help='Figure width')
    parser.add_argument('--fig-height', type=float, default=8, help='Figure height')
    
    args, unknown = parser.parse_known_args()
    return args
