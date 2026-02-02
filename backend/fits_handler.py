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
        self.unit = "Arbitrary Units"

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
            return self._process_hdul(hdul, os.path.basename(path))
        except Exception as e:
            return {"error": str(e)}

    def _process_hdul(self, hdul, filename):
        try:
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