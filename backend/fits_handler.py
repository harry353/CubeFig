import io
import os
import numpy as np
from astropy.io import fits
from astropy.wcs import WCS

# Global state storage
# In a real multi-user web app, this would be replaced by a Redis cache or session file
class FitsState:
    def __init__(self):
        self.data = None
        self.header = None
        self.wcs = None
        self.filename = None
        self.file_path = None # Store generic path
        self.mask = None
        self.mask_filename = None
        self.mask_path = None # Store generic path
        self.unit = "Arbitrary Units"
        self.global_min = None
        self.global_max = None
        self.moment_data = {} # {type: {'data': array, 'unit': label}}

    def load_fits(self, file_storage):
        """
        Reads from a Flask FileStorage object.
        """
        try:
            hdul = fits.open(file_storage.stream)
            return self._process_hdul(hdul, file_storage.filename)
        except Exception as e:
            return {"error": str(e)}

    def load_fits_from_path(self, path):
        """
        Reads from a local file path.
        """
        try:
            hdul = fits.open(path)
            self.file_path = os.path.abspath(path)
            return self._process_hdul(hdul, os.path.basename(path))
        except Exception as e:
            return {"error": str(e)}

    def load_mask(self, file_storage):
        """
        Reads mask from a Flask FileStorage object.
        """
        try:
            hdul = fits.open(file_storage.stream)
            return self._process_mask(hdul, file_storage.filename)
        except Exception as e:
            return {"error": str(e)}

    def load_mask_from_path(self, path):
        """
        Reads mask from a local file path.
        """
        try:
            hdul = fits.open(path)
            self.mask_path = os.path.abspath(path)
            return self._process_mask(hdul, os.path.basename(path))
        except Exception as e:
            return {"error": str(e)}

    def _process_mask(self, hdul, filename):
        try:
            if self.data is None:
                raise ValueError("Load a data cube before loading a mask.")

            mask_data = hdul[0].data
            if mask_data is None and len(hdul) > 1:
                mask_data = hdul[1].data

            mask_data = np.squeeze(mask_data)

            # Support 2D mask for 3D cube (broadcast spatially)
            if mask_data.ndim == 2:
                if mask_data.shape != self.data.shape[-2:]:
                    raise ValueError(f"2D Mask shape {mask_data.shape} does not match data spatial shape {self.data.shape[-2:]}.")
                # Broadcast up to 3D
                mask_data = np.repeat(mask_data[np.newaxis, :, :], self.data.shape[0], axis=0)
            elif mask_data.ndim == 3:
                if mask_data.shape != self.data.shape:
                    raise ValueError(f"3D Mask shape {mask_data.shape} does not match data shape {self.data.shape}.")
            else:
                raise ValueError(f"Mask must be 2D or 3D. Got {mask_data.ndim}D.")

            self.mask = mask_data
            self.mask_filename = filename
            
            print(f"DEBUG: Mask processed from {filename}")
            print(f"DEBUG: Final Mask shape: {self.mask.shape}")
            finite_mask = self.mask[np.isfinite(self.mask)]
            if finite_mask.size > 0:
                print(f"DEBUG: Mask Min/Max/Mean: {np.min(finite_mask)} / {np.max(finite_mask)} / {np.mean(finite_mask)}")
                print(f"DEBUG: Non-zero mask pixels: {np.count_nonzero(self.mask)}")
            else:
                print("DEBUG: Mask is entirely NaN!")

            return {"success": True, "filename": filename}
        except Exception as e:
            return {"error": str(e)}

    def _process_hdul(self, hdul, filename):
        try:
            self.moment_data = {}
            data = hdul[0].data
            header = hdul[0].header
            
            # If primary is empty (common in some standards), check extension 1
            if data is None and len(hdul) > 1:
                data = hdul[1].data
                header = hdul[1].header

            # Ensure data shape is correct
            data = np.squeeze(data)
            
            if data.ndim < 3:
                raise ValueError('File is not a 3D Data Cube (Channels, Y, X).')

            # Store in state
            self.data = data
            self.header = header
            self.wcs = WCS(header)
            self.filename = filename
            
            # Calculate global min/max for normalization
            self.global_min = float(np.nanmin(data))
            self.global_max = float(np.nanmax(data))
            
            # Extract Unit
            self.unit = header.get('BUNIT', 'Arbitrary Units').strip()

            # Extract Beam (BMAJ, BMIN in degrees, BPA in degrees)
            self.beam = {
                'bmaj': header.get('BMAJ'),
                'bmin': header.get('BMIN'),
                'bpa': header.get('BPA', 0)
            }

            return {"success": True, "channels": data.shape[0], "filename": self.filename}

        except Exception as e:
            return {"error": str(e)}

    def get_slice(self, channel_index):
        if self.data is None:
            return None
        return self.data[channel_index, :, :]

# Initialize a global instance
state = FitsState()