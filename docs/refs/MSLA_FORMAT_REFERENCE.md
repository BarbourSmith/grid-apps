# mSLA File Format Reference
## Complete Implementation Guide

**Generated:** 2026-05-16
**Total Formats:** 32

---

## Table of Contents

### Binary Formats (Magic Byte Headers)

| # | Format | Extensions | Manufacturer | Magic Bytes | Version | RLE |
|---|--------|-----------|--------------|-------------|---------|-----|
| 1 | CBDDLP | .cbddlp | Chitubox | `19 00 FD 12` (LE) | 1-2 | Yes (125) |
| 2 | CTB | .ctb | Chitubox | `86 00 FD 12` (LE) | 3 | Yes (125) |
| 3 | CTBv4 | .ctb | Chitubox | `06 01 FD 12` (LE) | 4-5 | Yes (125) |
| 4 | CTB Encrypted | .cbt | Chitubox | `07 01 FD 12` (LE) | 4 | AES+RLE |
| 5 | PHZ | .phz | Chitubox | `AE 83 DA 9F` (LE) | 2 | Yes (125) |
| 6 | Photon S | .photons | Anycubic | TAG1=2, TAG2=49 (BE) | 1 | Yes (128) |
| 7 | PSW/PW0 | .psw, .pw0 | Anycubic | Version field | 1,515-518 | RLE1/RLE4 |
| 8 | FDG | .fdg | Voxelab | `C8 7A 3C BD` (LE) | 2 | Yes |
| 9 | GOO | .goo, .prz | Elegoo | "V3.0" + `07 00 00 00` + "DLP\0" | 3 | Yes (delim) |
| 10 | MDLP | .mdlp | Makerbase | "MKSDLP" (7 bytes BE) | - | Vector |
| 11 | GR1 | .gr1 | GR Workshop | "MKSDLP" (7 bytes BE) | - | Vector |
| 12 | CXDLP v3 | .cxdlp | Creality | "CXSW3DV2" (9 bytes BE) | 3 | Yes |
| 13 | CXDLP v4 | .cxdlp | Creality | "CXSW3DV2" (9 bytes BE) | 4 | Yes |
| 14 | OSLA | .osla | Open SLA | "OSLATiCo" (8 bytes) | 0 | Varies |
| 15 | Anet N4/N7 | .anet | Anet | Version=3 (B9 format) | 3 | Yes |
| 16 | LGS/LGS30 | .lgs, .lgs30 | Longer Orange | "Longer3D" | - | Struct |

### Archive Formats (ZIP-based)

| # | Format | Extensions | Container | Manifest Type | Layer Format |
|---|--------|-----------|-----------|---------------|--------------|
| 17 | SL1 | .sl1 | ZIP | INI (config.ini) | PNG |
| 18 | Chitubox ZIP | .zip | ZIP | G-code (run.gcode) | Images |
| 19 | Anycubic ZIP | .pwsz | ZIP | JSON (manifest) | PNG (staged) |
| 20 | CWS | .cws | ZIP | XML (manifest.xml) | PNG |
| 21 | VDA | .vda | ZIP | XML (root.xml) | Images |
| 22 | VDT | .vdt | ZIP | JSON (manifest.json) | PNG |
| 23 | NanoDLP | .zip | ZIP | JSON (meta.json, etc.) | Images |
| 24 | Klipper | .zip | ZIP | G-code (run.gcode) | PNG |
| 25 | ZCode | .zcode | ZIP | XML (Print.xml) | Images |
| 26 | JXS | .jxs | ZIP | INI + JSON | Images |
| 27 | ZCodex | .zcodex | ZIP | JSON (metadata) | Images |
| 28 | UVJ | .uvj | ZIP | JSON (config.json) | PNG |
| 29 | Generic ZIP | .zip | ZIP | Various | Varies |

### Text/Vector Formats

| # | Format | Extensions | Encoding | Layer Representation |
|---|--------|-----------|----------|---------------------|
| 30 | QDT | .qdt | ASCII text | Text vectors (JieHe format) |
| 31 | SVGX | .svgx | XML (SVG 1.1) | SVG vector groups |
| 32 | OSF | .osf | Binary+Settings | Compressed image log |

### Generic Import

| # | Format | Extensions | Purpose |
|---|--------|-----------|---------|
| 33 | ImageFile | .png, .jpg, .jpeg, .jp2, .tif, .tiff, .bmp, .pbm, .pgm, .sr, .ras | Single-layer import |

---

## Taxonomy

### By Compression Method

**RLE-Based (Run-Length Encoding)**
- **RLE125**: CBDDLP, CTB, CTBv4, PHZ, FDG, CXDLP (limit: 125 consecutive pixels)
- **RLE128**: Photon S (limit: 128 consecutive pixels)
- **RLE1**: PSW (limit: 125)
- **RLE4**: PW0 (limit: 4095)
- **RLE+Delimiter**: GOO (uses `0x0D 0x0A` delimiter, `0x55` magic)
- **RLE+Encryption**: CTB Encrypted (AES-256-CBC + XOR)

**Lossless Image Compression**
- PNG-based: SL1, Chitubox ZIP, CWS, VDA, VDT, NanoDLP, Klipper, UVJ
- Mixed: OSLA (configurable), ZCode, ZCodex, JXS

**Vector Representation**
- **Line vectors**: MDLP, GR1 (LineCount + LayerLine[])
- **SVG paths**: SVGX (W3C SVG 1.1 groups)
- **Text vectors**: QDT (ASCII coordinate format)

**Structured Binary**
- LGS/LGS30 (custom pixel structure)
- Anet (B9Creator-derived)
- OSF (image log with compression)

### By File Structure

**Monolithic Binary**
- Chitubox family: CBDDLP, CTB, CTBv4, PHZ, CTB Encrypted
- Anycubic binary: Photon S, PSW, PW0
- Voxelab: FDG
- Elegoo: GOO
- Creality: CXDLP v3/v4
- Makerbase/GR: MDLP, GR1
- Longer: LGS/LGS30
- Anet: Anet N4/N7

**ZIP Archive**
- Manifest-based: SL1, VDA, VDT, ZCode, ZCodex, NanoDLP, UVJ
- G-code-based: Chitubox ZIP, Klipper
- Hybrid: CWS, JXS, Anycubic ZIP

**Plain Text/XML**
- QDT (text vectors)
- SVGX (SVG XML)
- OSLA (can be text-based)

### By Manufacturer/Ecosystem

**Chitubox Ecosystem** (largest family)
- CBDDLP, CTB, CTBv4, PHZ, CTB Encrypted, Chitubox ZIP
- Used by: Elegoo Mars, Anycubic Photon Mono, Creality LD series, Phrozen

**Anycubic Native**
- Photon S, PSW/PW0, Anycubic ZIP (PWSZ)
- Machines: Photon, Photon S, Photon Zero, Photon X, Photon Ultra, Photon D2

**Prusa**
- SL1
- Machine: Prusa SL1

**Elegoo**
- GOO (native format for Saturn series)

**Voxelab**
- FDG

**Creality**
- CXDLP v3/v4 (Box series)

**Zortrax**
- ZCodex

**Flashforge**
- SVGX

**Open Standards**
- OSLA (Open SLA)
- UVJ (vendor-neutral)
- Generic ZIP

**Maker/Klipper**
- Klipper (Mono printers)
- NanoDLP
- MDLP (Makerbase MKS)
- GR1 (GR Workshop)

### By Anti-Aliasing Support

**Built-in AA**
- CTB v3+ (7-level grayscale)
- PHZ
- ZCodex
- Klipper
- UVJ
- OSF
- Most PNG-based formats

**No AA / Binary Only**
- CBDDLP v1-2
- Photon S
- PSW/PW0 (firmware-dependent)
- QDT
- MDLP
- GR1

### By Encryption/Security

**Encrypted**
- CTB Encrypted (.cbt): AES-256-CBC, XOR layer keys

**Signed**
- ZCode: RSA signing with BouncyCastle

**Unencrypted**
- All others (open binary/archive formats)

---

## Header Structure Reference

### Binary Format Headers (for sandboxed implementation)

#### 1. CBDDLP (Chitubox v1-2)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 4    | uint32 | Magic                    | 0x12FD0019 (LE)
0x04   | 4    | uint32 | Version                  | 1 or 2
0x08   | 4    | float  | BedSizeX                 | mm
0x0C   | 4    | float  | BedSizeY                 | mm
0x10   | 4    | float  | BedSizeZ                 | mm
0x14   | 4    | uint32 | Unknown1                 |
0x18   | 4    | uint32 | Unknown2                 |
0x1C   | 4    | float  | TotalHeightMillimeter    |
0x20   | 4    | float  | LayerHeight              | mm
0x24   | 4    | float  | ExposureTime             | seconds
0x28   | 4    | float  | BottomExposureTime       | seconds
0x2C   | 4    | float  | LayerOffTime             | seconds
0x30   | 4    | uint32 | BottomLayerCount         |
0x34   | 4    | uint32 | ResolutionX              | pixels
0x38   | 4    | uint32 | ResolutionY              | pixels
0x3C   | 4    | uint32 | PreviewHighResOffset     | file offset
0x40   | 4    | uint32 | LayerTableOffset         | file offset
0x44   | 4    | uint32 | LayerCount               |
0x48   | 4    | uint32 | PreviewLowResOffset      | file offset
0x4C   | 4    | uint32 | PrintTime                | seconds
0x50   | 4    | uint32 | ProjectorType            | 0=Normal
0x54   | 4    | uint32 | PreviewLowResLength      | bytes
0x58   | 4    | uint32 | PreviewHighResLength     | bytes
0x5C   | 4    | float  | PrintParametersSize      | mm (v2+)
0x60   | 4    | uint32 | PrintParametersOffsetAddress | (v2+)
0x64   | 4    | uint32 | AntiAliasLevel           | 1 (v2+)
0x68   | 2    | uint16 | LightPWM                 | 0-255 (v2+)
0x6A   | 2    | uint16 | BottomLightPWM           | 0-255 (v2+)
```

**Preview Image Structure (RGB565)**
```
Offset | Size | Type   | Field
-------|------|--------|--------
0x00   | 4    | uint32 | Width
0x04   | 4    | uint32 | Height
0x08   | 4    | uint32 | DataLength
0x0C   | var  | uint16[]| RGB565 pixels (width * height * 2)
```

**Layer Table Entry (CBDDLP v1)**
```
Offset | Size | Type   | Field
-------|------|--------|------------------------
0x00   | 4    | float  | LayerPositionZ (mm)
0x04   | 4    | float  | ExposureTime (seconds)
0x08   | 4    | float  | LayerOffTime (seconds)
0x0C   | 4    | uint32 | DataOffset
0x10   | 4    | uint32 | DataLength
0x14   | 4    | uint32 | Reserved
```

**Layer Data (RLE125)**
```
For each run:
  byte[0] = color (0x00 = black, 0xFF = white)
  byte[1] = length (1-125)

If length > 125, split into multiple runs.
Encoded left-to-right, top-to-bottom.
```

#### 2. CTB (Chitubox v3)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 4    | uint32 | Magic                    | 0x12FD0086 (LE)
0x04   | 4    | uint32 | Version                  | 3
0x08   | 8    | float  | BedSizeX                 | mm
0x10   | 8    | float  | BedSizeY                 | mm
0x18   | 8    | float  | BedSizeZ                 | mm
0x20   | 4    | uint32 | Reserved1                |
0x24   | 4    | uint32 | Reserved2                |
0x28   | 8    | float  | TotalHeightMillimeter    |
0x30   | 8    | float  | LayerHeight              | mm
0x38   | 8    | float  | ExposureTime             | seconds
0x40   | 8    | float  | BottomExposureTime       | seconds
0x48   | 8    | float  | LayerOffTime             | seconds
0x50   | 4    | uint32 | BottomLayerCount         |
0x54   | 4    | uint32 | ResolutionX              | pixels
0x58   | 4    | uint32 | ResolutionY              | pixels
0x5C   | 4    | uint32 | PreviewLargeOffset       | file offset
0x60   | 4    | uint32 | LayerTableOffset         | file offset
0x64   | 4    | uint32 | LayerCount               |
0x68   | 4    | uint32 | PreviewSmallOffset       | file offset
0x6C   | 4    | uint32 | PrintTime                | seconds
0x70   | 4    | uint32 | ProjectorType            | 0=Normal
0x74   | 4    | uint32 | PrintParametersOffset    |
0x78   | 4    | uint32 | PrintParametersSize      |
0x7C   | 4    | uint32 | AntiAliasLevel           | 1, 2, 4, 8
0x80   | 2    | uint16 | LightPWM                 | 0-255
0x82   | 2    | uint16 | BottomLightPWM           | 0-255
0x84   | 4    | uint32 | Padding                  |
0x88   | 4    | uint32 | SlicerOffset             | file offset
0x8C   | 4    | uint32 | SlicerSize               | bytes
```

**Layer Table Entry (CTB v3)**
```
Offset | Size | Type   | Field
-------|------|--------|------------------------
0x00   | 4    | float  | LayerPositionZ (mm)
0x04   | 4    | float  | ExposureTime (seconds)
0x08   | 4    | float  | LayerOffTime (seconds)
0x0C   | 4    | uint32 | DataOffset
0x10   | 4    | uint32 | DataLength (compressed RLE)
0x14   | 4    | uint32 | Reserved1
0x18   | 4    | uint32 | Reserved2 (PageNumber in v4+)
```

#### 3. CTB v4 (Chitubox v4-5)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 4    | uint32 | Magic                    | 0x12FD0106 (LE)
0x04   | 4    | uint32 | Version                  | 4 or 5
... (similar to CTBv3, extended with per-layer settings support)
```

**New in v4:**
- Per-layer exposure times, lift heights, retract speeds
- PageNumber field in layer table (for layer grouping)
- Enhanced slicer metadata
- Support for transition layers

#### 4. PHZ (Photon Z)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 4    | uint32 | Magic                    | 0x9FDA83AE (LE)
0x04   | 4    | uint32 | Version                  | 2
0x08   | 4    | float  | BedSizeX                 | mm
... (similar structure to CTB)
```

#### 5. CTB Encrypted (.cbt)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 4    | uint32 | Magic                    | 0x12FD0107 (LE)
0x04   | 4    | uint32 | Version                  | 4
0x08   | 4    | uint32 | SettingsOffset           | offset to encrypted settings
0x0C   | 4    | uint32 | SettingsSize             | bytes
0x10   | 4    | uint32 | LayerSettingsOffset      | offset to layer settings array
0x14   | 4    | uint32 | LayerCount               |
```

**Encryption Details:**
- Settings: AES-256-CBC encrypted
- Key: Derived from machine ID
- Layer data: RLE data XORed with per-layer key (0xEFBEADDE)
- IV: Embedded in encrypted blocks

#### 6. Photon S (Anycubic)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 4    | uint32 | TAG1                     | 2 (BE)
0x04   | 4    | uint32 | TAG2                     | 49 (BE)
0x08   | 8    | double | XYPixelSize              | mm (BE)
0x10   | 4    | float  | LayerHeight              | mm (BE)
0x14   | 4    | float  | ExposureTime             | seconds (BE)
0x18   | 4    | float  | ExposureTimeBottom       | seconds (BE)
0x1C   | 4    | float  | LiftHeight               | mm (BE)
0x20   | 4    | float  | LiftSpeed                | mm/min (BE)
0x24   | 4    | float  | RetractSpeed             | mm/min (BE)
0x28   | 4    | float  | VolumeMl                 | ml (BE)
0x2C   | 4    | uint32 | BottomLayerCount         | (BE)
0x30   | 4    | uint32 | ResolutionX              | 1440 (BE)
0x34   | 4    | uint32 | ResolutionY              | 2560 (BE)
0x38   | 4    | uint32 | PreviewOffset            | file offset (BE)
0x3C   | 4    | uint32 | LayerTableOffset         | file offset (BE)
0x40   | 4    | uint32 | LayerCount               | (BE)
0x44   | 4    | uint32 | PreviewLengthAddress     | file offset (BE)
```

**RLE128 Encoding:**
```
For each run:
  byte[0] = length (1-128, BE)
  byte[1] = color (0x00 = black, 0xFF = white)
```

#### 7. PSW/PW0 (Anycubic PhotonS/Zero)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 2    | uint16 | HeaderSize               | bytes
0x02   | 2    | uint16 | Version                  | 1, 515-518
0x04   | 4    | float  | BedSizeX                 | mm
0x08   | 4    | float  | BedSizeY                 | mm
0x0C   | 4    | float  | BedSizeZ                 | mm
0x10   | 4    | uint32 | Reserved1                |
0x14   | 4    | uint32 | Reserved2                |
0x18   | 4    | float  | TotalHeight              | mm
0x1C   | 4    | float  | LayerHeight              | mm
0x20   | 4    | float  | ExposureTime             | seconds
0x24   | 4    | float  | BottomExposureTime       | seconds
0x28   | 4    | float  | LayerOffTime             | seconds
0x2C   | 4    | uint32 | BottomLayerCount         |
0x30   | 4    | uint32 | ResolutionX              | pixels
0x34   | 4    | uint32 | ResolutionY              | pixels
0x38   | 4    | uint32 | PreviewHighResOffset     |
0x3C   | 4    | uint32 | LayerTableOffset         |
0x40   | 4    | uint32 | LayerCount               |
0x44   | 4    | uint32 | PreviewLowResOffset      |
... (additional fields for newer versions)
```

**RLE1 Encoding (PSW, limit 125):**
```
For each run:
  byte[0] = color (0x00 = black, 0xFF = white)
  byte[1] = length (1-125)
```

**RLE4 Encoding (PW0, limit 4095):**
```
For each run:
  byte[0] = color (0x00 or 0xFF)
  byte[1-2] = length (1-4095, LE uint16)
```

**CRC Validation:**
- CRC-16-ANSI polynomial
- Applied to layer data blocks

#### 8. FDG (Voxelab)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 4    | uint32 | Magic                    | 0xBD3C7AC8 (LE)
0x04   | 4    | uint32 | Version                  | 2
0x08   | 4    | uint32 | LayerCount               |
0x0C   | 4    | uint32 | BottomLayerCount         |
0x10   | 4    | uint32 | ProjectorType            |
0x14   | 4    | uint32 | ResolutionX              | pixels
0x18   | 4    | uint32 | ResolutionY              | pixels
0x1C   | 4    | float  | LayerHeight              | mm
0x20   | 4    | float  | ExposureTime             | seconds
0x24   | 4    | float  | BottomExposureTime       | seconds
0x28   | 4    | uint32 | PreviewLargeOffset       |
0x2C   | 4    | uint32 | PreviewSmallOffset       |
... (additional fields)
```

#### 9. GOO (Elegoo)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 4    | char[] | VersionString            | "V3.0"
0x04   | 4    | uint32 | Version                  | 0x07000000 (BE)
0x08   | 4    | char[] | Magic                    | "DLP\0"
0x0C   | 32   | char[] | SoftwareInfo             | null-terminated
0x2C   | 4    | uint32 | ResolutionX              | pixels (BE)
0x30   | 4    | uint32 | ResolutionY              | pixels (BE)
0x34   | 4    | float  | DisplayWidthMM           | mm (BE)
0x38   | 4    | float  | DisplayHeightMM          | mm (BE)
0x3C   | 4    | float  | LayerHeight              | mm (BE)
0x40   | 4    | float  | ExposureTime             | seconds (BE)
0x44   | 4    | float  | BottomExposureTime       | seconds (BE)
0x48   | 4    | uint32 | BottomLayerCount         | (BE)
... (additional fields)
```

**GOO RLE Format:**
```
Runs are separated by delimiter: 0x0D 0x0A
Each run starts with magic byte: 0x55
Format:
  0x55 [color] [length_high] [length_low] 0x0D 0x0A

Color: 0x00 (black) or 0xFF (white)
Length: Big-endian uint16
```

**Preview Images (RGB565):**
- Small: 116x116 pixels
- Large: 290x290 pixels
- Format: RGB565 (5 bits red, 6 bits green, 5 bits blue)

#### 10. CXDLP v3 (Creality Box)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 4    | uint32 | MagicSize                | 9 (BE)
0x04   | 9    | char[] | MagicName                | "CXSW3DV2" (BE)
0x0D   | 4    | uint32 | Version                  | 3 (BE)
0x11   | 4    | uint32 | PrinterModel             | offset to string (BE)
0x15   | 4    | uint32 | ResolutionX              | pixels (BE)
0x19   | 4    | uint32 | ResolutionY              | pixels (BE)
0x1D   | 256  | uint32[]| LayerOffsets             | 64 offsets (BE)
... (layer table follows)
```

**Layer Offset Table:**
- 64 uint32 offsets (256 bytes total)
- Points to layer RLE data in file
- Big-endian encoding

#### 11. MDLP (Makerbase MKS)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 4    | uint32 | HeaderSize               | bytes (BE)
0x04   | 7    | char[] | Magic                    | "MKSDLP\0" (BE)
0x0B   | ... | struct | SlicerInfo               | (BE)
```

**SlicerInfo Structure:**
```
Offset | Size | Type   | Field
-------|------|--------|------------------------
0x00   | 4    | uint32 | LayerCount (BE)
0x04   | 4    | uint32 | ResolutionX (BE)
0x08   | 4    | uint32 | ResolutionY (BE)
0x0C   | 4    | float  | DisplayWidthMM (BE)
0x10   | 4    | float  | DisplayHeightMM (BE)
0x14   | 4    | float  | LayerHeight (BE)
0x18   | 4    | float  | ExposureTime (BE)
0x1C   | 4    | float  | BottomExposureTime (BE)
0x20   | 4    | uint32 | BottomLayerCount (BE)
```

**Vector Layer Format:**
```
For each layer:
  uint32 LineCount (BE)
  LayerLine[LineCount]:
    uint16 StartX (BE)
    uint16 EndX (BE)
    uint16 Y (BE)
```

#### 12. LGS/LGS30 (Longer Orange)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 8    | char[] | Magic                    | "Longer3D"
0x08   | 4    | uint32 | MagicKey                 | 34
0x0C   | 4    | uint32 | PrinterModel             | 10, 30, 120, 4000, 4500
0x10   | 4    | float  | PixelPerMMX              |
0x14   | 4    | float  | PixelPerMMY              |
0x18   | 4    | float  | LayerHeight              | mm
0x1C   | 4    | float  | ExposureTime             | seconds
0x20   | 4    | float  | BottomExposureTime       | seconds
0x24   | 4    | uint32 | BottomLayerCount         |
0x28   | 4    | uint32 | ResolutionX              | pixels
0x2C   | 4    | uint32 | ResolutionY              | pixels
... (additional fields)
```

#### 13. OSLA (Open SLA)

```
Offset | Size | Type   | Field                    | Notes
-------|------|--------|--------------------------|------------------
0x00   | 8    | char[] | Magic                    | "OSLATiCo"
0x08   | 4    | uint32 | Version                  | 0
0x0C   | 8    | uint64 | CreatedTimestamp         | Unix timestamp
0x14   | 8    | uint64 | ModifiedTimestamp        | Unix timestamp
0x1C   | 64   | char[] | CreatedBy                | null-terminated
0x5C   | 64   | char[] | ModifiedBy               | null-terminated
0x9C   | ... | struct | FileDef                  | metadata
... (Header, Preview tables, Layer tables follow)
```

**FileDef, Header structures:**
- Machine specs (build volume, resolution, display size)
- Preview format specification (PNG, RGB565, etc.)
- Layer format specification (PNG, RLE, etc.)
- Material and print parameter storage

---

## Archive Format Structures

### ZIP-based Formats

#### SL1 (Prusa)

**Required Files:**
- `config.ini` - Print parameters (INI format)
- `prusaslicer.ini` - Slicer settings (optional)
- `*.png` - Layer images (numbered: `00000.png`, `00001.png`, ...)

**config.ini Format:**
```ini
[general]
expTime = 8.0
expTimeFirst = 35.0
layerHeight = 0.05
numFade = 10
numFast = 0
numSlow = 5
printTime = 3600
usedMaterial = 10.5

[printer]
cropWidth = 0
cropHeight = 0
; ... (additional printer settings)
```

**Layer Naming:**
- Zero-padded 5-digit: `00000.png`, `00001.png`, `00002.png`
- PNG format (grayscale or RGBA)

#### UVJ (Vendor-Neutral)

**Required Files:**
- `config.json` - Print configuration
- `slice/*.png` - Layer images
- `preview/huge.png` - Large preview
- `preview/tiny.png` - Small preview

**config.json Structure:**
```json
{
  "size": {
    "x": 2560,
    "y": 1620,
    "layerHeight": 0.05,
    "millimeter": {
      "x": 192.0,
      "y": 120.0
    }
  },
  "exposure": {
    "lightOnTime": 8.0,
    "lightOffTime": 1.0,
    "lightPWM": 255,
    "liftHeight": 5.0,
    "liftSpeed": 100.0,
    "retractSpeed": 150.0
  },
  "bottom": {
    "count": 5,
    "lightOnTime": 35.0,
    "lightOffTime": 1.0,
    "lightPWM": 255,
    "liftHeight": 5.0,
    "liftSpeed": 100.0,
    "retractSpeed": 150.0
  },
  "layers": [
    {"z": 0.05},
    {"z": 0.10}
  ]
}
```

#### Anycubic ZIP (PWSZ)

**Required Files:**
- `manifest` - JSON manifest
- `bott_0/*.png`, `bott_1/*.png` - Bottom stage layers
- `normal_0/*.png`, `normal_1/*.png` - Normal stage layers

**Manifest Structure:**
```json
{
  "version": "1.0.0",
  "machine_type": "PhotonMono4K",
  "machine_extern": {
    "resolution_x": 3840,
    "resolution_y": 2400,
    "layer_height": 0.05,
    "exposure_time": 8.0
  }
}
```

#### VDT (Voxeldance Tango)

**Required Files:**
- `manifest.json` - VDTManifest
- `*.png` - Layer images
- `Preview_*.png` - Multiple preview angles

**manifest.json Structure:**
```json
{
  "machine": {
    "name": "VoxelPrinter",
    "resolution": {"x": 3840, "y": 2400},
    "size": {"x": 192.0, "y": 120.0, "z": 200.0}
  },
  "print": {
    "layer_height": 0.05,
    "exposure_time": 8.0,
    "bottom_exposure_time": 35.0,
    "bottom_layers": 5
  },
  "statistics": {
    "total_time": 3600,
    "volume": 10.5
  }
}
```

#### NanoDLP

**Required Files:**
- `meta.json` - NanoDLPMetaManifest
- `slicer.json` - Slicer info
- `plate.json` - Platform info
- `profile.json` - Print profile
- `override.json` - Layer overrides
- `*.png` - Layer images
- `3d.png` + `3d.png.meta` - 3D preview

**meta.json Structure:**
```json
{
  "version": 1,
  "boundary": {
    "x": 192.0,
    "y": 120.0,
    "z": 200.0
  },
  "colors": [
    {"name": "Resin1", "rgb": "#808080"}
  ]
}
```

### Text/XML Formats

#### QDT (Emake3D Galaxy 1)

**Header Line:**
```
JieHe,{LayerThickness},{ResolutionY},{ResolutionX},2,019,0,FA
```

Example:
```
JieHe,0.05,1440,2560,2,019,0,FA
```

**Layer Format:**
```
FB{LayerNumber}    // Layer start
{X1},{Y1},{X2},{Y2},...  // Vector coordinates (line segments)
FC                 // Layer end
```

**End Marker:**
```
FD                 // File end
```

**Full Example:**
```
JieHe,0.05,1440,2560,2,019,0,FA
FB0
100,100,200,100
200,100,200,200
FC
FB1
150,150,250,150
FC
FD
```

#### SVGX (Flashforge)

**SVG Root Structure:**
```xml
<?xml version="1.0" encoding="utf-8"?>
<svg xmlns="http://www.w3.org/2000/svg" version="1.1">
  <PrintParams>
    <machine>FlashforgePrinter</machine>
    <material>Resin</material>
    <layerThickness>0.05</layerThickness>
    <resolutionX>2560</resolutionX>
    <resolutionY>1440</resolutionY>
    <displayWidth>192.0</displayWidth>
    <displayHeight>120.0</displayHeight>
  </PrintParams>
  <ProjectionTime>
    <attachtime>35.0</attachtime>
    <basetime>8.0</basetime>
  </ProjectionTime>
  <ProjectionAdjust>
    <liftHeight>5.0</liftHeight>
    <liftSpeed>100.0</liftSpeed>
  </ProjectionAdjust>
  <g id="layer_0">
    <!-- SVG path elements for layer 0 -->
  </g>
  <g id="layer_1">
    <!-- SVG path elements for layer 1 -->
  </g>
</svg>
```

---

## Encoding Details

### RLE (Run-Length Encoding) Variants

**RLE125 (CBDDLP, CTB, PHZ, FDG, CXDLP):**
```
Maximum run length: 125 pixels
Format (2 bytes per run):
  byte[0] = color (0x00 = off, 0xFF = on)
  byte[1] = length (1-125)

Encoding order: Left-to-right, top-to-bottom
Endianness: Little-endian (LE)

Example (white run of 100 pixels, black run of 50):
  FF 64 00 32
```

**RLE128 (Photon S):**
```
Maximum run length: 128 pixels
Format (2 bytes per run):
  byte[0] = length (1-128, BE)
  byte[1] = color (0x00 = off, 0xFF = on)

Encoding order: Left-to-right, top-to-bottom
Endianness: Big-endian (BE)

Example (white run of 100 pixels):
  64 FF
```

**RLE4 (PW0):**
```
Maximum run length: 4095 pixels
Format (3 bytes per run):
  byte[0] = color (0x00 or 0xFF)
  byte[1-2] = length (1-4095, LE uint16)

Example (white run of 1000 pixels):
  FF E8 03
```

**GOO RLE (Delimiter-based):**
```
Each run:
  0x55 [color] [length_high] [length_low] 0x0D 0x0A

color: 0x00 (black) or 0xFF (white)
length: Big-endian uint16
delimiter: 0x0D 0x0A (CR LF)

Example (white run of 500 pixels):
  55 FF 01 F4 0D 0A
```

**CTB Encrypted RLE:**
```
1. Standard RLE125 encoding
2. XOR entire RLE data with per-layer key: 0xEFBEADDE
3. Repeat XOR key as needed for data length

Decryption:
  for i in 0..data.len():
    data[i] ^= key_bytes[i % 4]
```

### Vector Encoding

**MDLP/GR1 Line Format:**
```
For each layer:
  uint32 LineCount (BE)

For each line:
  uint16 StartX (BE)
  uint16 EndX (BE)
  uint16 Y (BE)

Lines are horizontal scan lines (Y is constant).
StartX and EndX define the lit pixel range.
Multiple lines can exist for the same Y coordinate.
```

**QDT Text Vectors:**
```
Format: comma-separated coordinates
{X1},{Y1},{X2},{Y2},{X3},{Y3},...

Interpretation:
  - Pairs define line segments
  - Connect consecutive points
  - Coordinates are in pixels
```

**SVGX (SVG Paths):**
```xml
<g id="layer_{number}">
  <path d="M 100 100 L 200 100 L 200 200 Z" fill="#FFFFFF"/>
  <path d="M 150 150 L 250 150 L 250 250 Z" fill="#FFFFFF"/>
</g>

SVG path commands:
  M = moveto
  L = lineto
  Z = closepath

Fill color determines pixel value:
  #FFFFFF = white (exposed)
  #000000 = black (masked)
```

### Preview Image Encoding

**RGB565 Format:**
```
16 bits per pixel (2 bytes):
  bits [15:11] = Red (5 bits, 0-31)
  bits [10:5]  = Green (6 bits, 0-63)
  bits [4:0]   = Blue (5 bits, 0-31)

Packed as uint16 (little-endian):
  uint16 pixel = (R << 11) | (G << 5) | B

To convert to RGB888:
  R8 = (R5 << 3) | (R5 >> 2)
  G8 = (G6 << 2) | (G6 >> 4)
  B8 = (B5 << 3) | (B5 >> 2)
```

**PNG (Archive formats):**
- Standard PNG compression
- Grayscale (8-bit) or RGBA
- Use standard PNG libraries for decode/encode

### Anti-Aliasing

**7-level Grayscale (CTB v3+, PHZ):**
```
Pixel values for AA:
  0x00 = 0% (fully masked)
  0x2A = ~16%
  0x55 = ~33%
  0x7F = ~50%
  0xAA = ~66%
  0xD4 = ~83%
  0xFF = 100% (fully exposed)

Encoding: 8-bit grayscale in RLE or PNG
```

**PNG-based AA:**
- Full 8-bit grayscale (0-255)
- Linear exposure mapping
- Used in SL1, UVJ, VDT, etc.

---

## Implementation Guidance

### For Sandboxed Environments (No External Libraries)

#### Recommended Implementation Order

1. **Start with simplest formats:**
   - QDT (text-based, easy parsing)
   - UVJ (JSON + PNG, if PNG decoder available)
   - ImageFile (single image input)

2. **Binary formats (if binary I/O available):**
   - CBDDLP (oldest, simplest binary format)
   - CTB v3 (more modern, clean structure)
   - GOO (delimiter-based RLE, good for learning)

3. **Archive formats (if ZIP available):**
   - SL1 (INI + PNG)
   - UVJ (JSON + PNG)
   - NanoDLP (multiple JSON manifests)

4. **Advanced formats (complex/encrypted):**
   - CTB Encrypted (requires AES)
   - ZCode (requires RSA)
   - Vector formats (MDLP, GR1, SVGX)

#### Essential Algorithms

**RLE125 Decoder (Pseudocode):**
```python
def decode_rle125(data, width, height):
    pixels = bytearray(width * height)
    pixel_index = 0
    data_index = 0

    while data_index < len(data):
        color = data[data_index]
        length = data[data_index + 1]
        data_index += 2

        for i in range(length):
            pixels[pixel_index] = color
            pixel_index += 1

    return pixels
```

**RLE125 Encoder (Pseudocode):**
```python
def encode_rle125(pixels):
    rle_data = bytearray()
    i = 0

    while i < len(pixels):
        color = pixels[i]
        length = 1

        # Count consecutive pixels (max 125)
        while (i + length < len(pixels) and
               pixels[i + length] == color and
               length < 125):
            length += 1

        rle_data.append(color)
        rle_data.append(length)
        i += length

    return rle_data
```

**RGB565 Decode (Pseudocode):**
```python
def rgb565_to_rgb888(rgb565_data):
    rgb888 = bytearray(len(rgb565_data) // 2 * 3)

    for i in range(0, len(rgb565_data), 2):
        pixel = (rgb565_data[i+1] << 8) | rgb565_data[i]  # LE

        r5 = (pixel >> 11) & 0x1F
        g6 = (pixel >> 5) & 0x3F
        b5 = pixel & 0x1F

        r8 = (r5 << 3) | (r5 >> 2)
        g8 = (g6 << 2) | (g6 >> 4)
        b8 = (b5 << 3) | (b5 >> 2)

        rgb888[i//2*3] = r8
        rgb888[i//2*3+1] = g8
        rgb888[i//2*3+2] = b8

    return rgb888
```

**CRC-16-ANSI (for Anycubic validation):**
```python
def crc16_ansi(data):
    crc = 0
    polynomial = 0x8005

    for byte in data:
        crc ^= (byte << 8)
        for _ in range(8):
            if crc & 0x8000:
                crc = (crc << 1) ^ polynomial
            else:
                crc = crc << 1
            crc &= 0xFFFF

    return crc
```

#### Minimal Dependencies

**Required for most formats:**
- Binary I/O (struct packing/unpacking)
- File I/O (read/write/seek)
- Basic data structures (arrays, dictionaries)

**Optional but recommended:**
- ZIP library (for archive formats)
- JSON parser (for modern formats)
- INI parser (for SL1)
- XML parser (for CWS, VDA, ZCode, SVGX)
- PNG encoder/decoder (for archive formats)

**Advanced (format-specific):**
- AES-256-CBC (CTB Encrypted)
- RSA (ZCode signing)
- CRC-16 (Anycubic validation)
- SVG path parser (SVGX)

#### Common Pitfalls

1. **Endianness:**
   - Chitubox family: Little-endian (LE)
   - Anycubic Photon S: Big-endian (BE)
   - Elegoo GOO: Big-endian (BE)
   - Always check format specification

2. **File offsets:**
   - Many formats use absolute file offsets
   - Seek to offset before reading data
   - Offsets are typically from file start (position 0)

3. **RLE limits:**
   - RLE125: max 125 pixels per run
   - RLE128: max 128 pixels per run
   - RLE4: max 4095 pixels per run
   - Split longer runs into multiple entries

4. **String encoding:**
   - Most formats: ASCII or UTF-8
   - Anet: UTF-16 Big-Endian
   - Always check format specification

5. **Null termination:**
   - Many string fields are null-terminated
   - Pad to fixed length with null bytes
   - Don't include null in string length calculations

6. **Preview images:**
   - RGB565 is stored as raw pixel data (no header)
   - Calculate size: width × height × 2 bytes
   - Some formats include dimension fields, others are fixed

7. **Layer count vs. array indices:**
   - Layer count = total layers
   - Layer array is zero-indexed (0 to count-1)
   - Don't access layer[count] (out of bounds)

---

## Quick Reference Table

### Format Selection Guide

| Use Case | Recommended Format | Reason |
|----------|-------------------|--------|
| Maximum compatibility | CTB | Widest printer support |
| Smallest file size | CBDDLP | Binary RLE, minimal metadata |
| Archival/preservation | UVJ or OSLA | Open standard, PNG layers |
| Editing/manipulation | SL1 or UVJ | PNG layers, human-readable config |
| Fastest decode | PNG-based (SL1, UVJ) | Standard image decoders |
| Embedded systems | QDT or MDLP | Text/vector, low memory |
| Security/DRM | CTB Encrypted | AES encryption |
| Multi-material | NanoDLP | Color/material support |
| Cross-platform | ZIP-based formats | Standard compression |

### Format Complexity Rating

| Complexity | Formats |
|------------|---------|
| Low | QDT, ImageFile, UVJ, SL1 |
| Medium | CBDDLP, CTB, PHZ, Photon S, PSW/PW0, GOO |
| High | FDG, LGS, MDLP, GR1, CXDLP, VDT, NanoDLP |
| Very High | CTB Encrypted, ZCode, OSF, SVGX |

---

## Additional Resources

**Binary Structure Visualization:**
- Use hex editors with structure templates
- Popular tools: 010 Editor, HxD, ImHex
- Many formats have community-created templates

**Testing:**
- Start with known-good files from UVtools test suite
- Validate decoded data against reference images
- Test edge cases (single pixel, full white/black, checkerboard)

**Performance Optimization:**
- RLE encoding: Use lookup tables for run detection
- Batch processing: Read/write in large chunks
- Memory mapping: Use for large files (>100MB)
- Parallel processing: Process layers concurrently

**Validation:**
- Always validate magic bytes before parsing
- Check layer count matches actual data
- Verify file offsets are within file bounds
- Validate image dimensions match header specs
- Check CRC/checksum fields if present

---

## Version History

**Document Version:** 1.0
**Generated From:** UVtools.Core/FileFormats/ (analyzed 2026-05-16)
**Format Count:** 32 formats
**Coverage:** Complete header structures, encoding details, implementation guidance

**Notes:**
- This document is based on UVtools source code analysis
- Format specifications may evolve; check UVtools repository for updates
- Some proprietary formats may have undocumented features
- Always test implementations against reference files

---

## License & Attribution

This reference document is derived from UVtools (https://github.com/sn4k3/UVtools).

UVtools is licensed under AGPL-3.0. Implementations based on this documentation should comply with applicable licenses.

**Maintainer:** UVtools project
**Contributors:** Community reverse-engineering efforts
