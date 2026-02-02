#include <math.h>
#include <stdint.h>
#include <stdbool.h>

/**
 * Computes moments 0, 1, and 2 for a single spatial pixel (row, col)
 * 
 * data: float pointer to the 3D data (channels * height * width)
 * v: float pointer to velocity array (channels)
 * channels: number of channels in the subset
 * height, width: spatial dimensions
 * row, col: current pixel indices
 * compute0, compute1, compute2: flags for which moments to calculate
 * 
 * results: pointers to output arrays (height * width)
 */
void compute_pixel_moments(
    const float* data, 
    const float* v,
    int channels, 
    int height, 
    int width,
    int row, 
    int col,
    bool compute0, 
    bool compute1, 
    bool compute2,
    double dv,
    float* mom0_out, 
    float* mom1_out, 
    float* mom2_out
) {
    double sum_i = 0.0;
    double sum_iv = 0.0;
    int pixel_idx = row * width + col;

    // First pass: Sums for Mom0 and Mom1
    for (int c = 0; c < channels; c++) {
        float val = data[c * (height * width) + pixel_idx];
        if (!isnan(val)) {
            sum_i += val;
            sum_iv += (double)val * v[c];
        }
    }

    if (sum_i == 0.0) {
        if (compute0) mom0_out[pixel_idx] = 0.0f;
        if (compute1) mom1_out[pixel_idx] = NAN;
        if (compute2) mom2_out[pixel_idx] = NAN;
        return;
    }

    float m1 = (float)(sum_iv / sum_i);

    if (compute0) mom0_out[pixel_idx] = (float)(sum_i * dv);
    if (compute1) mom1_out[pixel_idx] = m1;

    // Second pass: Variance for Mom2
    if (compute2) {
        double sum_i_v_m1_sq = 0.0;
        for (int c = 0; c < channels; c++) {
            float val = data[c * (height * width) + pixel_idx];
            if (!isnan(val)) {
                double diff = v[c] - m1;
                sum_i_v_m1_sq += (double)val * (diff * diff);
            }
        }
        mom2_out[pixel_idx] = (float)sqrt(sum_i_v_m1_sq / sum_i);
    }
}

/**
 * Main entry point for C moment calculation
 * 
 * data: flattened 3D array (channels, height, width)
 * v: 1D array of world coordinates (velocity/frequency)
 * channels, height, width: dimensions
 * dv: step size
 * compute*: booleans
 * out*: result arrays
 */
void calculate_moments_c(
    const float* data,
    const float* v,
    int channels,
    int height,
    int width,
    double dv,
    bool compute0,
    bool compute1,
    bool compute2,
    float* mom0_out,
    float* mom1_out,
    float* mom2_out
) {
    for (int r = 0; r < height; r++) {
        for (int c = 0; c < width; c++) {
            compute_pixel_moments(
                data, v, channels, height, width, 
                r, c, 
                compute0, compute1, compute2,
                dv, 
                mom0_out, mom1_out, mom2_out
            );
        }
    }
}
