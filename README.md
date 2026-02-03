<p align="center">
  <img src="assets/cubefig_project_logo.png" width="250">
</p>

# CubeFig - Publication-Ready Moment Maps in Seconds

CubeFig is a high-performance interactive tool designed for astronomers to generate **publication-quality moment maps** from spectral cubes with minimal effort. CubeFig streamlines the workflow from FITS cube to final figure, handling physical conversions, masking, and layout automatically.

## Why CubeFig?

- **🚀 Fast Performance**: Powered by a **custom C backend**, CubeFig calculates moments (Intensity, Velocity, Dispersion) efficiently, enabling real-time exploration of large datasets.
- **📄 Publication Ready**: specific focus on generating figures that are ready for inclusion in journals (PDF/SVG support, proper physical axes, beam ellipses).
- **⚡ Efficient Workflow**: Load data -> Apply Mask -> Compute Moments -> Export. Done.

## Key Features

- **High-Performance Moment Calculation**: Compute Moment 0, 1, and 2 near-instantly using C extensions.
- **Interactive Visualization**: Scroll through channel maps and inspect masks in real-time.
- **Smart Plotting**:
    - Automatic WCS to Physical coordinate conversion (pc, kpc, Mpc).
    - Precise control over figure dimensions, margins, and overlays.
    - Toggleable Beam, Grid, and Colorbar elements.
- **Session Persistence**: Save your workspace and resume exactly where you left off.

## Usage

Start the application using:

```bash
python app.py [arguments]
```

### Quick Start Example

Visualize the NGC 1068 Torus CO(3-2) data:

```bash
python app.py \
  --file examples/NGC1068_torus_CO32.fits \
  --mask examples/NGC1068_torus_CO32_mask.fits \
  --title "NGC 1068 Torus (CO 3-2)" \
  --grid \
  --show-beam \
  --show-center \
  --center-coords 83 66 \
  --show-physical \
  --target-distance 14.4e6 \
  --offset-unit pc
```

### Common Arguments

- `--file`: Path to FITS file to load.
- `--mask`: Path to FITS mask file.
- `--show-physical`: Enable physical distance axes.
- `--target-distance`: Distance to object (required for physical axes).
- `--fig-width` / `--fig-height`: Set exact figure dimensions in inches.

## Gallery

![Moment 0 Map](assets/ngc_1068_torus_co_3-2_moment_0.png)
