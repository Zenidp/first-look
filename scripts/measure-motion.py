"""Mean/peak absolute frame-to-frame change on downscaled greyscale.

The measurement FINDINGS 9b prescribes. Baselines from that section:
  "turns slowly"                4.84 mean / 7.05 peak   <- kept
  "stands still, minimal motion" 9.98 mean / 16.31 peak <- reverted as worse
"""
import subprocess, sys
import numpy as np
import imageio_ffmpeg

W, H = 160, 214
exe = imageio_ffmpeg.get_ffmpeg_exe()

for path in sys.argv[1:]:
    raw = subprocess.run(
        [exe, "-v", "error", "-i", path, "-vf", f"scale={W}:{H},format=gray",
         "-f", "rawvideo", "-pix_fmt", "gray", "-"],
        capture_output=True).stdout
    n = len(raw) // (W * H)
    if n < 2:
        print(f"{path}: only {n} frames"); continue
    f = np.frombuffer(raw[: n * W * H], dtype=np.uint8).reshape(n, H, W).astype(np.int16)
    d = np.abs(np.diff(f, axis=0)).mean(axis=(1, 2))
    print(f"{path.split('/')[-1][:12]}  frames={n:3d}  mean={d.mean():5.2f}  peak={d.max():5.2f}")
