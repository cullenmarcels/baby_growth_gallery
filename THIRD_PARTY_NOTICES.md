# Third-party notices for photo processing

This project uses the following components for the closed-test photo upload feature.
This file records provenance; it is not a substitute for legal review.

| Component | Version | License | Source | Use and replacement |
| --- | --- | --- | --- | --- |
| `sharp` | 0.35.4 | Apache-2.0 | <https://github.com/lovell/sharp> | JPEG/PNG/WebP decoding and safe WebP variants; replace with another metadata-stripping image pipeline. |
| `@keeratita/heic-converter` | 0.4.1 | MIT | <https://github.com/keeratita/heic-converter> | HEIC/HEIF WASM decoder adapter; replace with a separately reviewed HEIF service or licensed decoder. |
| `libheif` | 1.23.2 (embedded WASM) | LGPL-3.0-or-later | <https://github.com/strukturag/libheif> | Embedded by the HEIC converter. Public production release is blocked pending independent license review. |
| `libde265` | 1.1.1 (embedded WASM) | LGPL-3.0-or-later | <https://github.com/strukturag/libde265> | HEVC decoding used by embedded libheif. Public production release is blocked pending independent license review. |
| `exifr` | 7.1.3 | MIT | <https://github.com/MikeKovarik/exifr> | Reads only orientation and capture-date fields; no GPS fields are requested or persisted. |
| `file-type` | 22.1.0 | MIT | <https://github.com/sindresorhus/file-type> | Server-side magic-byte detection. |

The closed test may include these LGPL components. Before any public product release,
review distribution obligations, preserve all applicable license texts and attribution,
and either approve this distribution or replace the HEIC path. The original upload is
deleted after processing; no source EXIF, GPS, XMP, ICC profile, device identifier, or
original filename is persisted.
