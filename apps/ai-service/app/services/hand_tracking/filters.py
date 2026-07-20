import math
from typing import List, Optional

class LowPassFilter:
    def __init__(self, alpha: float, initial_value: float = 0.0):
        self.alpha = alpha
        self.last_value = initial_value
        self.initialized = False

    def filter(self, value: float) -> float:
        if not self.initialized:
            self.last_value = value
            self.initialized = True
            return value
        
        filtered = self.alpha * value + (1.0 - self.alpha) * self.last_value
        self.last_value = filtered
        return filtered


class OneEuroFilter:
    def __init__(
        self,
        freq: float = 60.0,
        mincutoff: float = 1.0,
        beta: float = 0.007,
        dcutoff: float = 1.0
    ):
        self.freq = freq
        self.mincutoff = mincutoff
        self.beta = beta
        self.dcutoff = dcutoff
        
        self.x_filter = LowPassFilter(self._alpha(mincutoff))
        self.dx_filter = LowPassFilter(self._alpha(dcutoff))
        self.last_value: Optional[float] = None

    def _alpha(self, cutoff: float) -> float:
        tau = 1.0 / (2.0 * math.pi * cutoff)
        te = 1.0 / self.freq
        return 1.0 / (1.0 + tau / te)

    def filter(self, val: float, timestamp: float = 0.0) -> float:
        if self.last_value is None:
            self.last_value = val
            return val

        # Calculate frequency dynamically if timestamp is provided
        # Fall back to configured freq if dt <= 0
        dt = 0.0
        if timestamp > 0.0:
            # Assume timestamp in seconds
            dt = 1.0 / self.freq # default
        
        dval = (val - self.last_value) / dt if dt > 0 else 0.0
        edval = self.dx_filter.filter(dval)
        
        cutoff = self.mincutoff + self.beta * abs(edval)
        alpha = self._alpha(cutoff)
        
        self.x_filter.alpha = alpha
        filtered_val = self.x_filter.filter(val)
        
        self.last_value = filtered_val
        return filtered_val


class OneEuroFilter3D:
    def __init__(
        self,
        freq: float = 60.0,
        mincutoff: float = 1.0,
        beta: float = 0.007,
        dcutoff: float = 1.0
    ):
        self.x_filter = OneEuroFilter(freq, mincutoff, beta, dcutoff)
        self.y_filter = OneEuroFilter(freq, mincutoff, beta, dcutoff)
        self.z_filter = OneEuroFilter(freq, mincutoff, beta, dcutoff)

    def filter(self, x: float, y: float, z: float, timestamp: float = 0.0) -> tuple[float, float, float]:
        fx = self.x_filter.filter(x, timestamp)
        fy = self.y_filter.filter(y, timestamp)
        fz = self.z_filter.filter(z, timestamp)
        return fx, fy, fz


class MovingAverageFilter3D:
    def __init__(self, window_size: int = 5):
        self.window_size = window_size
        self.history: List[tuple[float, float, float]] = []

    def filter(self, x: float, y: float, z: float) -> tuple[float, float, float]:
        self.history.append((x, y, z))
        if len(self.history) > self.window_size:
            self.history.pop(0)

        sum_x = sum(pt[0] for pt in self.history)
        sum_y = sum(pt[1] for pt in self.history)
        sum_z = sum(pt[2] for pt in self.history)
        n = len(self.history)
        
        return sum_x / n, sum_y / n, sum_z / n
