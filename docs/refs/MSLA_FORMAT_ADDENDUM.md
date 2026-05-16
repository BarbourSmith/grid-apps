# mSLA Format Reference - Critical Addendum
## CTB RLE & PM4N Version Corrections

**Date:** 2026-05-16
**Status:** Code-verified corrections to v2 reference

---

## Issue 1: CTB RLE Encoding - CORRECTED

### Previous (Incorrect) Description
"RLE125: Simple 2-byte fixed format (color, length), max 125 pixels"

This was doubly misleading: CTB does not use RLE125, and UVtools' CBDDLP/PWS
RLE125 implementation is a 1-byte bit-plane run format, not a two-byte
`(color, length)` pair.

### Actual Implementation (from ChituboxFile.cs:825-908)

CTB uses a **7-bit grayscale variable-length RLE** with optional encryption, NOT simple RLE125.

#### Encoding Algorithm

**Step 1: Color Quantization**
```c
grey7 = pixel_value >> 1  // Convert 8-bit (0-255) to 7-bit (0-127)
```

**Step 2: Variable-Length Run Encoding**

The encoding uses a **variable-length stride format**:

| Stride Length | Bytes | Format | Description |
|--------------|-------|--------|-------------|
| 1 pixel | 1 byte | `[0ccccccc]` | Color only, bit 7 clear |
| 2-127 pixels | 2 bytes | `[1ccccccc] [0rrrrrrr]` | Color + 7-bit length |
| 128-16383 pixels | 3 bytes | `[1ccccccc] [10rrrrrr] [rrrrrrrr]` | Color + 14-bit length |
| 16384-2097151 pixels | 4 bytes | `[1ccccccc] [110rrrrr] [rrrrrrrr] [rrrrrrrr]` | Color + 21-bit length |
| 2097152-268435455 pixels | 5 bytes | `[1ccccccc] [1110rrrr] [rrrrrrrr] [rrrrrrrr] [rrrrrrrr]` | Color + 28-bit length |

**Bit Layout:**
- `c` = color bits (7-bit grayscale, 0-127)
- `r` = repeat/stride bits
- Bit 7 of first byte: `1` if stride > 1, `0` if stride == 1
- Length byte prefix bits indicate multi-byte length encoding

#### Detailed Encoding Logic (from source)

```c
void AddRep()
{
    if (stride == 0) return;

    if (stride > 1) {
        color |= 0x80;  // Set bit 7 to indicate run follows
    }
    rawData.Add(color);

    if (stride <= 1) {
        // Single pixel: just the color byte
        return;
    }

    if (stride <= 0x7f) {  // 127
        // 1-byte length: [0rrrrrrr]
        rawData.Add((byte)stride);
        return;
    }

    if (stride <= 0x3fff) {  // 16383
        // 2-byte length: [10rrrrrr] [rrrrrrrr]
        rawData.Add((byte)((stride >> 8) | 0x80));
        rawData.Add((byte)stride);
        return;
    }

    if (stride <= 0x1fffff) {  // 2097151
        // 3-byte length: [110rrrrr] [rrrrrrrr] [rrrrrrrr]
        rawData.Add((byte)((stride >> 16) | 0xc0));
        rawData.Add((byte)(stride >> 8));
        rawData.Add((byte)stride);
        return;
    }

    if (stride <= 0xfffffff) {  // 268435455
        // 4-byte length: [1110rrrr] [rrrrrrrr] [rrrrrrrr] [rrrrrrrr]
        rawData.Add((byte)((stride >> 24) | 0xe0));
        rawData.Add((byte)(stride >> 16));
        rawData.Add((byte)(stride >> 8));
        rawData.Add((byte)stride);
    }
}
```

#### Decoding Algorithm

```python
def decode_ctb_rle(data: bytes, width: int, height: int) -> bytes:
    pixels = bytearray(width * height)
    pixel_pos = 0
    i = 0

    while i < len(data):
        color_byte = data[i]
        i += 1

        # Extract 7-bit color and expand back to 8-bit.
        # Non-zero levels map to odd values so 0x7F becomes 0xFF.
        grey7 = color_byte & 0x7F
        color = 0 if grey7 == 0 else (grey7 << 1) | 1

        # Check if run follows (bit 7 set)
        if (color_byte & 0x80) == 0:
            # Single pixel
            pixels[pixel_pos] = color
            pixel_pos += 1
            continue

        # Multi-pixel run: decode length
        length_byte = data[i]
        i += 1

        if (length_byte & 0x80) == 0:
            # 1-byte length (7 bits)
            stride = length_byte
        elif (length_byte & 0x40) == 0:
            # 2-byte length (14 bits)
            stride = ((length_byte & 0x3F) << 8) | data[i]
            i += 1
        elif (length_byte & 0x20) == 0:
            # 3-byte length (21 bits)
            stride = ((length_byte & 0x1F) << 16) | (data[i] << 8) | data[i+1]
            i += 2
        else:
            # 4-byte length (28 bits)
            stride = ((length_byte & 0x0F) << 24) | (data[i] << 16) | (data[i+1] << 8) | data[i+2]
            i += 3

        # Fill pixels
        for _ in range(stride):
            pixels[pixel_pos] = color
            pixel_pos += 1

    return pixels
```

#### Encryption (Optional)

If the CTB header encryption seed is non-zero, RLE data is XORed with a per-layer key stream derived from that seed:

**Encryption Algorithm (from ChituboxFile.cs:2227-2248):**
```c
void LayerRleCryptBuffer(uint seed, uint layerIndex, byte[] input)
{
    if (seed == 0) return;

    uint init = seed * 0x2d83cdac + 0xd8a83423;
    uint key = (layerIndex * 0x1e1530cd + 0xec3d47cd) * init;

    int index = 0;
    for (int i = 0; i < input.Length; i++)
    {
        byte k = (byte)(key >> (8 * index));
        index++;

        if ((index & 3) == 0) {
            key += init;
            index = 0;
        }

        input[i] = (byte)(input[i] ^ k);
    }
}
```

**Key Generation:**
```
init = seed * 0x2D83CDAC + 0xD8A83423
key_base = (layerIndex * 0x1E1530CD + 0xEC3D47CD) * init

For each 4-byte block:
  XOR with bytes from key_base (little-endian)
  After 4 bytes, update: key_base += init
```

#### Anti-Aliasing Support

CTB format supports 7-bit grayscale (128 levels), enabling smooth anti-aliasing:
- 0x00 = fully masked (black)
- 0x7F = fully exposed (white)
- 0x01-0x7E = partial exposure (anti-aliasing)

#### Example Encodings

**Example 1: Single white pixel**
```
Input: 1 pixel at value 255
Encoded: 7F
  - grey7 = 255 >> 1 = 127 = 0x7F
  - stride = 1, so bit 7 stays clear
  - Output: [0x7F] (1 byte)
```

**Example 2: Run of 100 white pixels**
```
Input: 100 pixels at value 255
Encoded: FF 64
  - grey7 = 127 = 0x7F
  - stride = 100 = 0x64
  - 100 <= 127, so 1-byte length
  - color with bit 7 set: 0x7F | 0x80 = 0xFF
  - Output: [0xFF] [0x64] (2 bytes)
```

**Example 3: Run of 500 gray pixels (value 128)**
```
Input: 500 pixels at value 128
Encoded: C0 81 F4
  - grey7 = 128 >> 1 = 64 = 0x40
  - stride = 500 = 0x1F4
  - 500 > 127 and <= 16383, so 2-byte length
  - color with bit 7: 0x40 | 0x80 = 0xC0
  - length high: (500 >> 8) | 0x80 = 0x01 | 0x80 = 0x81
  - length low: 500 & 0xFF = 0xF4
  - Output: [0xC0] [0x81] [0xF4] (3 bytes)
```

**Example 4: Run of 20000 pixels**
```
Input: 20000 pixels at value 200
Encoded: E4 C0 4E 20
  - grey7 = 200 >> 1 = 100 = 0x64
  - stride = 20000 = 0x4E20
  - 20000 > 16383, so 3-byte length
  - color: 0x64 | 0x80 = 0xE4
  - length encoding: 0x4E20 with 0xC0 prefix
    - Byte 0: ((0x4E20 >> 16) & 0x1F) | 0xC0 = 0xC0
    - Byte 1: (0x4E20 >> 8) & 0xFF = 0x4E
    - Byte 2: 0x4E20 & 0xFF = 0x20
  - Output: [0xE4] [0xC0] [0x4E] [0x20] (4 bytes)
```

#### Key Differences from the Previous Two-Byte Description

| Feature | Previous two-byte description | CTB Variable RLE |
|---------|---------------|------------------|
| **Color depth** | 8-bit (0-255) | 7-bit (0-127) |
| **Max run (1-byte)** | 125 | 127 |
| **Max run (total)** | 125 | 268,435,455 |
| **Bytes per run** | 2 (fixed) | 1-5 (variable) |
| **Single pixel** | 2 bytes | 1 byte |
| **Anti-aliasing** | Binary or limited | Full 7-bit grayscale |
| **Encryption** | No | Optional per-layer XOR |
| **Compression** | Moderate | Better for long runs |

#### Implementation Recommendations

1. **Decoding CTB:**
   - Read color byte
   - Check bit 7 for run flag
   - If clear: single pixel
   - If set: decode variable-length stride
   - Apply encryption if seed != 0

2. **Encoding CTB:**
   - Quantize to 7-bit: `grey7 = pixel >> 1`
   - Group consecutive identical pixels
   - Encode with optimal byte count (1-5 bytes)
   - Apply encryption if required

3. **Encryption Handling:**
   - Always check the CTB header encryption seed
   - If non-zero, decrypt before RLE decode
   - Use layer-specific key derivation

---

## Issue 2: .pm4n Version Classification - AMBIGUOUS

### Current Status in UVtools

**Extension Registration:**
```c
// AnycubicFile.cs:1058
new(typeof(AnycubicFile), "pm4n", "Photon Mono 4 (PM4N)")
```

**Machine Mapping:**
```c
// AnycubicFile.cs:1731-1733
if (FileEndsWith(".pm4n"))
{
    return AnyCubicMachine.PhotonMono4;
}
```

**Version Mapping:**
```c
// AnycubicFile.cs:1155-1191
public override uint[] GetAvailableVersionsForExtension(string? extension)
{
    switch (extension)
    {
        case "pm3n":
        case "pm5":
        case "px6s":
            return [VERSION_517];        // ← pm3n, pm5, px6s are v517

        case "pm5s":
        case "m5sp":
            return [VERSION_518];        // ← pm5s, m5sp are v518

        // NOTE: .pm4n is NOT in the switch statement!

        default:
            return AvailableVersions;    // ← .pm4n falls through here
    }
}

// AvailableVersions = [VERSION_1, VERSION_515, VERSION_516, VERSION_517, VERSION_518]
```

**PrusaSlicer Profile:**
```ini
# PrusaSlicer/printer/Anycubic Photon Mono 4.ini
FILEFORMAT_PM4N
# No FILEVERSION_517 entry is present.
```

### The Ambiguity

**`.pm4n` extension:**
- ✓ Registered as valid extension
- ✓ Maps to PhotonMono4 machine
- ✗ **NOT** explicitly assigned to any version in `GetAvailableVersionsForExtension`
- ✗ PrusaSlicer profile declares `FILEFORMAT_PM4N` but does not declare `FILEVERSION_517`
- Returns all versions: `[1, 515, 516, 517, 518]`

### Possible Interpretations

1. **Oversight:** UVtools forgot to add .pm4n to the v517 case block
2. **Intentional:** .pm4n can legitimately be multiple versions (firmware evolution)
3. **Unknown:** Insufficient real-world fixtures to determine correct version

### User Implementation Note

**User's current implementation treats `.pm4n` as v517**, which is:
- ✓ Consistent with similar naming (.pm3n, .pm5 are v517)
- ✓ Logical based on product generation
- ⚠️ **UNVERIFIED** by UVtools code/profile metadata (could be any version)

### Recommendations

**For Implementation:**
```c
// Conservative approach (allow multiple versions):
if (extension == "pm4n") {
    return [VERSION_515, VERSION_516, VERSION_517];
}

// Aggressive approach (assume v517 based on naming):
if (extension == "pm4n") {
    return [VERSION_517];
}
```

**For Validation:**
1. Obtain real .pm4n fixture files from PhotonMono4 printer
2. Decode header and check `FileMarkSettings.Version` value
3. Verify header table length (92 bytes = v517, 96 bytes = v518)
4. Verify layer definition entries remain 32 bytes each; v518 may also include `SUBIMGS` sublayer entries
5. Document actual version found in fixtures

**Fixture Verification Checklist:**
- [ ] Acquire .pm4n file from PhotonMono4
- [ ] Verify file mark starts with ASCII `ANYCUBIC`
- [ ] Read version at offset 0x0C (little-endian uint32 in the `FileMark`)
- [ ] Check `HEADER` table length (92 = v517, 96 = v518)
- [ ] Check layer definition entries are 32 bytes each
- [ ] Check whether `SUBIMGS` and `PREVIEW2` tables are present
- [ ] Document findings

### Comparison with Similar Extensions

| Extension | Machine | Version in Code | Logic |
|-----------|---------|-----------------|-------|
| .pm3n | PhotonMono2 | 517 (explicit) | ✓ Defined |
| **.pm4n** | **PhotonMono4** | **??? (default all)** | ⚠️ **Ambiguous** |
| .pm5 | PhotonMonoM5 | 517 (explicit) | ✓ Defined |
| .pm5s | PhotonMonoM5s | 518 (explicit) | ✓ Defined |

**Pattern suggests:** .pm4n should likely be v517, but this is **NOT verified in UVtools source**.

---

## Updated Classification

### Anycubic Modern Formats (CORRECTED)

| Extension | Machine | Version | Status |
|-----------|---------|---------|--------|
| .pm3n | PhotonMono2 | 517 | ✓ Verified |
| **.pm4n** | **PhotonMono4** | **517 (assumed)** | **⚠️ UNVERIFIED** |
| .pm5 | PhotonMonoM5 | 517 | ✓ Verified |
| .px6s | PhotonMonoX6Ks | 517 | ✓ Verified |
| .pm5s | PhotonMonoM5s | 518 | ✓ Verified |
| .m5sp | PhotonMonoM5sPro | 518 | ✓ Verified |

### Action Items for Documentation

1. **CTB RLE:** Update main reference with variable-length encoding details
2. **.pm4n:** Mark as "Assumed v517, requires fixture validation"
3. **Testing:** Add note about lack of test fixtures in UVtools repository
4. **Encryption:** Document optional per-layer XOR encryption for CTB

---

## Code References

**CTB RLE Encoding:**
- Implementation: `ChituboxFile.cs:825-908` (EncodeCtbImage)
- Decoding: `ChituboxFile.cs:685-745` (DecodeImage)
- Encryption: `ChituboxFile.cs:2220-2248` (LayerRleCrypt)

**Anycubic Versions:**
- Extension mapping: `AnycubicFile.cs:1155-1191` (GetAvailableVersionsForExtension)
- Machine detection: `AnycubicFile.cs:1731-1733` (FileEndsWith check)
- Version constants: `AnycubicFile.cs:30-33` (VERSION_515-518)
- Photon Mono 4 PrusaSlicer profile: `PrusaSlicer/printer/Anycubic Photon Mono 4.ini` (`FILEFORMAT_PM4N`, no `FILEVERSION_517`)

---

## Summary

**CTB RLE:**
- ❌ Previous: Incorrectly described as simple two-byte RLE125
- ✅ Correct: Variable-length 7-bit grayscale RLE (1-5 bytes/run, max 268M, optional encryption)

**.pm4n Version:**
- ❌ Previous: Listed under v517 without caveat
- ✅ Correct: Ambiguous in UVtools (defaults to all versions), **assumed v517 pending fixture validation**

**Document Status:** Ready for integration into main reference with caveats noted.
