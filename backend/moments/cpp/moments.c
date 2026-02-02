#include <math.h>
#include <stdint.h>
#include <stdbool.h>
#include <stdlib.h>
#include <string.h>

/**
 * Optimized Moment Map Calculation
 * 
 * Uses a single-pass "Horizontal Sweep" through memory for maximum cache performance.
 * Leverages the variance identity Var(X) = E[X^2] - (E[X])^2 to compute Mom 2 in one go.
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
    int num_pixels = height * width;

    // Use double precision for accumulators to prevent rounding errors during single-pass
    double* sum_i  = (double*)calloc(num_pixels, sizeof(double));
    double* sum_iv = (double*)calloc(num_pixels, sizeof(double));
    double* sum_iv2 = (double*)calloc(num_pixels, sizeof(double));

    if (!sum_i || !sum_iv || !sum_iv2) {
        if (sum_i) free(sum_i);
        if (sum_iv) free(sum_iv);
        if (sum_iv2) free(sum_iv2);
        return;
    }

    // Pass 1: Accumulate sums across all channels
    // Outer loop over channels, inner loops over spatial coordinates (contiguous sweep)
    for (int c = 0; c < channels; c++) {
        float vc = v[c];
        double vc_d = (double)vc;
        double vc2_d = vc_d * vc_d;
        
        const float* channel_data = data + (c * num_pixels);

        #pragma omp parallel for
        for (int p = 0; p < num_pixels; p++) {
            float val = channel_data[p];
            if (!isnan(val)) {
                sum_i[p] += (double)val;
                if (compute1 || compute2) {
                    double val_d = (double)val;
                    sum_iv[p] += val_d * vc_d;
                    if (compute2) {
                        sum_iv2[p] += val_d * vc2_d;
                    }
                }
            }
        }
    }

    // Pass 2: Finalize moment values
    #pragma omp parallel for
    for (int p = 0; p < num_pixels; p++) {
        double s_i = sum_i[p];
        if (s_i == 0.0) {
            if (compute0) mom0_out[p] = 0.0f;
            if (compute1) mom1_out[p] = NAN;
            if (compute2) mom2_out[p] = NAN;
            continue;
        }

        if (compute0) {
            mom0_out[p] = (float)(s_i * dv);
        }

        double m1 = 0.0;
        if (compute1 || compute2) {
            m1 = sum_iv[p] / s_i;
            if (compute1) mom1_out[p] = (float)m1;
        }

        if (compute2) {
            // Var(X) = E[X^2] - (E[X])^2
            double m2_sq = (sum_iv2[p] / s_i) - (m1 * m1);
            // Protect against tiny negative values due to floating point precision
            mom2_out[p] = (m2_sq > 0.0) ? (float)sqrt(m2_sq) : 0.0f;
        }
    }

    free(sum_i);
    free(sum_iv);
    free(sum_iv2);
}
