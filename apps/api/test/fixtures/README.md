# Synthetic image fixtures

These files are repository-authored color grids and contain no people, children,
personal data, or third-party photography.

- `synthetic-grid.ppm` is the plain-text source, and `synthetic-grid.png` is the
  lossless input generated from the same 4×4 RGB values with `sharp@0.35.4`.
- `synthetic-grid.heic` is encoded with `heif-enc 1.23.0`, Alpine 3.24
  `libheif-tools` plus `libheif-x265`, at quality 90 using the primary image only.
- `synthetic-grid.heif` is the same single HEVC primary image with the generic
  `mif1` HEIF major brand. It verifies HEIF classification independently from
  the HEIC brand.

SHA-256:

- `synthetic-grid.heic`: `E86ECB5768CF4527DA7CB807D39C61476A5075E5469DD327D14480A3ACE4E858`
- `synthetic-grid.heif`: `4E779CBC064B3F2004CB0FD44CD597B8A2233FF3B7600242E611F1D822BE565A`

Regenerate only with an explicitly recorded encoder version, then update the
hashes and verify that the processing tests still prove all output variants are
static, metadata-free WebP files.
