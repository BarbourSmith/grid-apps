/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

import { imageToRowMajor, renderRasterLayers, round } from './raster.js';

const FAMILY = "Photon Workshop";
const MARK_SIZE = 12;
const VERSION_517 = 517;
const RLE4_ENCODING_LIMIT = 0xfff;
const FORMAT_RECORDS = {
    pw0:  { ext: "pw0",  generation: "pw",     notes: "Photon Zero" },
    pwx:  { ext: "pwx",  generation: "pw",     notes: "Photon X" },
    pwmo: { ext: "pwmo", generation: "mono",   notes: "Photon Mono" },
    pwma: { ext: "pwma", generation: "mono",   notes: "Photon Mono 4K class" },
    pwms: { ext: "pwms", generation: "mono",   notes: "Photon Mono SE class" },
    pwmx: { ext: "pwmx", generation: "mono-x", notes: "Photon Mono X class" },
    pwmb: { ext: "pwmb", generation: "m3",     notes: "Photon M3 / Mono X 6K class" },
    pwsq: { ext: "pwsq", generation: "m3",     notes: "Photon M3 Premium class" },
    px6s: { ext: "px6s", generation: "m3",     notes: "Photon X 6Ks class" },
    pm3:  { ext: "pm3",  generation: "m3",     notes: "Photon M3" },
    pm3n: { ext: "pm3n", generation: "m3",     notes: "Photon Mono 2" },
    pm3m: { ext: "pm3m", generation: "m3",     notes: "Photon M3 Max / Plus class" },
    pm3r: { ext: "pm3r", generation: "m3",     notes: "Photon M3 resolver variant" },
    pm4m: { ext: "pm4m", generation: "m4",     notes: "Photon Mono M4 class" },
    pm4u: { ext: "pm4u", generation: "m4",     notes: "Photon Mono 4 Ultra class" },
    pm4n: { ext: "pm4n", generation: "m4",     notes: "Photon Mono 4" },
    pm5:  { ext: "pm5",  generation: "m5",     notes: "Photon Mono M5" },
    pm5s: { ext: "pm5s", generation: "m5",     notes: "Photon Mono M5s" },
    pm7:  { ext: "pm7",  generation: "m7",     notes: "Photon Mono M7 class" },
    pm7m: { ext: "pm7m", generation: "m7",     notes: "Photon Mono M7 Pro class" },
    pwsz: { ext: "pwsz", generation: "v3-zip", notes: "Photon Workshop v3 zip container" }
};
const ENCODE_FORMATS = new Set(["pm4n"]);

function encode(print, progress, renderer) {
    let format = print.settings.device.slaFormat || "pm4n";
    let rec = FORMAT_RECORDS[format];

    if (format === "pm4n") {
        if (renderer) {
            return Promise.resolve(encodePM4N(print, progress, renderer));
        }
        return import('./x_photon.js').then(({ photon }) =>
            encodePM4N(print, progress, photon));
    }

    return Promise.reject(new Error([
        `${FAMILY} format .${format} is registered but not implemented.`,
        rec ? `Detected family generation: ${rec.generation} (${rec.notes}).` : "",
        "Add a known-good fixture sliced by Photon Workshop for this exact extension before enabling this output target."
    ].join(" ")));
}

function encodePM4N(print, progress, photon) {
    let layers = [];
    let preview = createPreview(224, 168);

    let { ctx, volume } = renderRasterLayers(print, photon, params => {
        let { index, rendered, bottom, z, ctx } = params;
        let { process, width, height } = ctx;
        let raster = imageToRowMajor(rendered.image, width, height);
        let encoded = encodePW0(raster);

        accumulatePreview(preview, rendered.image, width, height);
        layers.push({
            index,
            data: encoded,
            nonzero: countNonZero(raster),
            liftHeight: bottom ? process.slaBasePeelDist : process.slaPeelDist,
            liftSpeed: (bottom ? process.slaBasePeelLiftRate : process.slaPeelLiftRate) * 60,
            exposure: bottom ? process.slaBaseOn : process.slaLayerOn,
            z
        });
    }, progress ? (value) => progress(value * 0.85, "pm4n_encode") : null);

    let file = writeAnycubic({ ctx, layers, volume, preview });
    if (progress) progress(1, "pm4n_write");

    return { file, layers: layers.length, volume };
}

function read(input) {
    let view = toDataView(input);
    let mark = readString(view, 0, MARK_SIZE);
    if (mark !== "ANYCUBIC") {
        throw new Error(`invalid Anycubic mark ${mark}`);
    }

    let file = {
        mark,
        version: view.getUint32(12, true),
        tableCount: view.getUint32(16, true),
        headerOffset: view.getUint32(20, true),
        softwareOffset: view.getUint32(24, true),
        previewOffset: view.getUint32(28, true),
        colorTableOffset: view.getUint32(32, true),
        layerDefOffset: view.getUint32(36, true),
        extraOffset: view.getUint32(40, true),
        machineOffset: view.getUint32(44, true),
        layerImageOffset: view.getUint32(48, true),
        modelOffset: view.getUint32(52, true)
    };

    return {
        file,
        header: readHeader(view, file.headerOffset),
        preview: file.previewOffset ? readPreview(view, file.previewOffset) : null,
        layers: readLayerDefs(view, file.layerDefOffset),
        machine: file.machineOffset ? readMachine(view, file.machineOffset) : null
    };
}

function decodeLayer(view, layer, pixelCount) {
    let data = new Uint8Array(
        view.buffer,
        view.byteOffset + layer.dataOffset,
        layer.dataLength
    );
    return decodePW0(data, pixelCount);
}

function writeAnycubic(params) {
    let { ctx, layers, volume, preview } = params;
    let { device, process, width, height } = ctx;
    let fileMarkSize = MARK_SIZE + 11 * 4;
    let headerOffset = fileMarkSize;
    let headerSize = 16 + 92;
    let previewOffset = headerOffset + headerSize;
    let previewData = encodePreview(preview);
    let previewSize = 28 + previewData.length;
    let colorTableOffset = previewOffset + previewSize;
    let colorTableSize = 28;
    let layerDefOffset = colorTableOffset + colorTableSize;
    let layerDefSize = 16 + 4 + layers.length * 32;
    let extraOffset = layerDefOffset + layerDefSize;
    let extraSize = 16 + 56;
    let machineOffset = extraOffset + extraSize;
    let machineSize = 156;
    let softwareOffset = machineOffset + machineSize;
    let softwareSize = 164;
    let modelOffset = softwareOffset + softwareSize;
    let modelSize = 48;
    let layerImageOffset = modelOffset + modelSize;
    let total = layerImageOffset;

    layers.forEach(layer => {
        layer.dataOffset = total;
        layer.dataLength = layer.data.length;
        total += layer.dataLength;
    });

    let writer = new BinaryWriter(new ArrayBuffer(total));
    writeFileMark(writer, {
        version: VERSION_517,
        tableCount: 9,
        headerOffset,
        softwareOffset,
        previewOffset,
        colorTableOffset,
        layerDefOffset,
        extraOffset,
        machineOffset,
        layerImageOffset,
        modelOffset
    });
    writer.seek(headerOffset);
    writeHeader(writer, { device, process, width, height, layers, volume });
    writer.seek(previewOffset);
    writePreview(writer, preview, previewData);
    writer.seek(colorTableOffset);
    writeColorTable(writer);
    writer.seek(layerDefOffset);
    writeLayerDefinitions(writer, layers);
    writer.seek(extraOffset);
    writeExtra(writer, process);
    writer.seek(machineOffset);
    writeMachine(writer, { device, width, height });
    writer.seek(softwareOffset);
    writeSoftware(writer);
    writer.seek(modelOffset);
    writeModel(writer, { device, process, layers });
    layers.forEach(layer => {
        writer.seek(layer.dataOffset);
        writer.writeBytes(layer.data);
    });

    return writer.buffer;
}

function writeFileMark(writer, mark) {
    writer.writeString("ANYCUBIC", MARK_SIZE);
    writer.writeU32(mark.version);
    writer.writeU32(mark.tableCount);
    writer.writeU32(mark.headerOffset);
    writer.writeU32(mark.softwareOffset);
    writer.writeU32(mark.previewOffset);
    writer.writeU32(mark.colorTableOffset);
    writer.writeU32(mark.layerDefOffset);
    writer.writeU32(mark.extraOffset);
    writer.writeU32(mark.machineOffset);
    writer.writeU32(mark.layerImageOffset);
    writer.writeU32(mark.modelOffset);
}

function writeHeader(writer, params) {
    let { device, process, width, height, layers, volume } = params;
    let printTime = Math.round((process.slaBaseLayers * process.slaBaseOn) +
        Math.max(0, layers.length - process.slaBaseLayers) * process.slaLayerOn);

    writer.writeTable("HEADER", 92);
    writer.writeF32(pixelSizeMicrons(device.bedWidth, width));
    writer.writeF32(process.slaSlice);
    writer.writeF32(process.slaLayerOn);
    writer.writeF32(process.slaLayerOff);
    writer.writeF32(process.slaBaseOn);
    writer.writeF32(process.slaBaseLayers);
    writer.writeF32(process.slaPeelDist);
    writer.writeF32(process.slaPeelLiftRate);
    writer.writeF32(process.slaPeelDropRate);
    writer.writeF32(volume);
    writer.writeU32(process.slaAntiAlias || 1);
    writer.writeU32(width);
    writer.writeU32(height);
    writer.writeF32(0);
    writer.writeF32(0);
    writer.writeString("$", 4);
    writer.writeU32(0);
    writer.writeU32(printTime);
    writer.writeU32(0);
    writer.writeU32(0);
    writer.writeU32(0);
    writer.writeU16(0);
    writer.writeU16(0);
    writer.writeU32(0);
}

function writePreview(writer, preview, data) {
    writer.writeTable("PREVIEW", 28 + data.length);
    writer.writeU32(preview.width);
    writer.writeString("x", 4);
    writer.writeU32(preview.height);
    writer.writeBytes(data);
}

function writeColorTable(writer) {
    writer.writeU32(0);
    writer.writeU32(16);
    for (let i=1; i<=16; i++) {
        writer.writeU8(Math.min(255, Math.round(i * 255 / 16)));
    }
    writer.writeU32(0);
}

function writeLayerDefinitions(writer, layers) {
    writer.writeTable("LAYERDEF", 4 + layers.length * 32);
    writer.writeU32(layers.length);
    layers.forEach(layer => {
        writer.writeU32(layer.dataOffset);
        writer.writeU32(layer.dataLength);
        writer.writeF32(layer.liftHeight);
        writer.writeF32(layer.liftSpeed / 60);
        writer.writeF32(layer.exposure);
        writer.writeF32(layer.z);
        writer.writeU32(layer.nonzero);
        writer.writeU32(0);
    });
}

function writeExtra(writer, process) {
    writer.writeTable("EXTRA", 24);
    writer.writeU32(2);
    writer.writeF32(process.slaBasePeelDist);
    writer.writeF32(process.slaBasePeelLiftRate);
    writer.writeF32(process.slaPeelDropRate);
    writer.writeF32(0);
    writer.writeF32(0);
    writer.writeF32(process.slaPeelDropRate);
    writer.writeU32(2);
    writer.writeF32(process.slaPeelDist);
    writer.writeF32(process.slaPeelLiftRate);
    writer.writeF32(process.slaPeelDropRate);
    writer.writeF32(0);
    writer.writeF32(0);
    writer.writeF32(process.slaPeelDropRate);
}

function writeMachine(writer, params) {
    let { device, width, height } = params;

    writer.writeTable("MACHINE", 156);
    writer.writeString("Photon Mono 4", 96);
    writer.writeString("pw0Img", 16);
    writer.writeU32(16);
    writer.writeU32(7);
    writer.writeF32(device.bedWidth);
    writer.writeF32(device.bedDepth);
    writer.writeF32(device.maxHeight || device.bedHeight);
    writer.writeU32(VERSION_517);
    writer.writeU32(6506241);
}

function writeSoftware(writer) {
    writer.writeString("GridSpace Kiri:Moto", 32);
    writer.writeU32(164);
    writer.writeString("dev", 32);
    writer.writeString("js", 64);
    writer.writeString("none", 32);
}

function writeModel(writer, params) {
    let { device, process, layers } = params;
    let maxZ = layers.length ? layers[layers.length - 1].z : process.slaSlice;

    writer.writeTable("MODEL", 48);
    writer.writeF32(-device.bedWidth / 2);
    writer.writeF32(-device.bedDepth / 2);
    writer.writeF32(0);
    writer.writeF32(device.bedWidth / 2);
    writer.writeF32(device.bedDepth / 2);
    writer.writeF32(maxZ);
    writer.writeU32(0);
    writer.writeF32(0);
}

function createPreview(width, height) {
    return {
        width,
        height,
        image: new Uint8Array(width * height * 2)
    };
}

function accumulatePreview(preview, image, width, height) {
    let xscale = width / preview.width;
    let yscale = height / preview.height;

    for (let y=0; y<preview.height; y++) {
        let sy = Math.min(height - 1, Math.floor(y * yscale));
        for (let x=0; x<preview.width; x++) {
            let sx = Math.min(width - 1, Math.floor(x * xscale));
            let pos = (y * preview.width + x) * 2;
            if (image[sx * height + sy]) {
                preview.image[pos] = 0xff;
                preview.image[pos + 1] = 0xff;
            }
        }
    }
}

function encodePreview(preview) {
    return preview.image;
}

function encodePW0(image) {
    let output = [];
    let lastColor = -1;
    let reps = 0;

    function flush() {
        while (reps > 0) {
            let done = reps;
            if (lastColor === 0 || lastColor === 0xf) {
                done = Math.min(done, RLE4_ENCODING_LIMIT);
                let code = done | (lastColor << 12);
                output.push((code >> 8) & 0xff, code & 0xff);
            } else {
                done = Math.min(done, 0xf);
                output.push(((lastColor << 4) | done) & 0xff);
            }
            reps -= done;
        }
    }

    for (let i=0; i<image.length; i++) {
        let color = image[i] >> 4;
        if (color === lastColor) {
            reps++;
        } else {
            flush();
            lastColor = color;
            reps = 1;
        }
    }

    flush();
    return new Uint8Array(output);
}

function decodePW0(input, pixelCount) {
    let image = new Uint8Array(pixelCount);
    let pixel = 0;

    for (let i=0; i<input.length && pixel<pixelCount; i++) {
        let b = input[i];
        let code = b >> 4;
        let repeat = b & 0x0f;
        let color;

        if (code === 0 || code === 0x0f) {
            color = code === 0 ? 0 : 255;
            i++;
            if (i >= input.length) {
                repeat = pixelCount - pixel;
            } else {
                repeat = (repeat << 8) + input[i];
            }
        } else {
            color = (code << 4) | code;
        }

        if (pixel + repeat > pixelCount) {
            throw new Error(`PW0 RLE overrun (${pixel + repeat} > ${pixelCount})`);
        }
        image.fill(color, pixel, pixel + repeat);
        pixel += repeat;
    }

    if (pixel !== pixelCount) {
        throw new Error(`PW0 RLE underrun (${pixel} < ${pixelCount})`);
    }

    return image;
}

function countNonZero(image) {
    let count = 0;
    for (let i=0; i<image.length; i++) {
        if (image[i]) count++;
    }
    return count;
}

function readHeader(view, offset) {
    expectTable(view, offset, "HEADER");
    let at = offset + 16;
    return {
        pixelSizeUm: view.getFloat32(at, true),
        layerHeight: view.getFloat32(at + 4, true),
        exposure: view.getFloat32(at + 8, true),
        waitTimeBeforeCure: view.getFloat32(at + 12, true),
        bottomExposure: view.getFloat32(at + 16, true),
        bottomLayers: view.getFloat32(at + 20, true),
        liftHeight: view.getFloat32(at + 24, true),
        liftSpeed: view.getFloat32(at + 28, true),
        retractSpeed: view.getFloat32(at + 32, true),
        volume: view.getFloat32(at + 36, true),
        antiAlias: view.getUint32(at + 40, true),
        resolutionX: view.getUint32(at + 44, true),
        resolutionY: view.getUint32(at + 48, true)
    };
}

function readPreview(view, offset) {
    let length = expectTable(view, offset, "PREVIEW");
    return {
        offset,
        length,
        width: view.getUint32(offset + 16, true),
        height: view.getUint32(offset + 24, true),
        dataOffset: offset + 28,
        dataLength: length - 28
    };
}

function readLayerDefs(view, offset) {
    expectTable(view, offset, "LAYERDEF");
    let count = view.getUint32(offset + 16, true);
    let layers = [];
    let at = offset + 20;

    for (let index=0; index<count; index++) {
        layers.push({
            index,
            dataOffset: view.getUint32(at, true),
            dataLength: view.getUint32(at + 4, true),
            liftHeight: view.getFloat32(at + 8, true),
            liftSpeed: view.getFloat32(at + 12, true),
            exposure: view.getFloat32(at + 16, true),
            z: view.getFloat32(at + 20, true),
            nonzero: view.getUint32(at + 24, true),
            padding: view.getUint32(at + 28, true)
        });
        at += 32;
    }

    return layers;
}

function readMachine(view, offset) {
    expectTable(view, offset, "MACHINE");
    return {
        name: readString(view, offset + 16, 96),
        imageFormat: readString(view, offset + 112, 16),
        maxAntiAlias: view.getUint32(offset + 128, true),
        propertyFields: view.getUint32(offset + 132, true),
        displayWidth: view.getFloat32(offset + 136, true),
        displayHeight: view.getFloat32(offset + 140, true),
        machineZ: view.getFloat32(offset + 144, true),
        maxFileVersion: view.getUint32(offset + 148, true)
    };
}

function expectTable(view, offset, name) {
    let found = readString(view, offset, MARK_SIZE);
    if (found !== name) {
        throw new Error(`expected ${name} table at ${offset}, found ${found}`);
    }
    return view.getUint32(offset + MARK_SIZE, true);
}

function pixelSizeMicrons(width, resolution) {
    return round((width / resolution) * 1000);
}

function toDataView(input) {
    return input instanceof DataView
        ? input
        : new DataView(input.buffer || input, input.byteOffset || 0, input.byteLength);
}

function readString(view, offset, length) {
    let chars = [];
    for (let i=0; i<length; i++) {
        let c = view.getUint8(offset + i);
        if (c === 0) break;
        chars.push(String.fromCharCode(c));
    }
    return chars.join("");
}

class BinaryWriter {
    constructor(buffer) {
        this.buffer = buffer;
        this.view = new DataView(buffer);
        this.pos = 0;
    }

    seek(pos) {
        this.pos = pos;
    }

    writeTable(name, length) {
        this.writeString(name, MARK_SIZE);
        this.writeU32(length);
    }

    writeBytes(bytes) {
        new Uint8Array(this.buffer, this.pos, bytes.length).set(bytes);
        this.pos += bytes.length;
    }

    writeString(value, length) {
        for (let i=0; i<length; i++) {
            this.writeU8(i < value.length ? value.charCodeAt(i) : 0);
        }
    }

    writeU8(value) {
        this.view.setUint8(this.pos, value);
        this.pos += 1;
    }

    writeU16(value) {
        this.view.setUint16(this.pos, value, true);
        this.pos += 2;
    }

    writeU32(value) {
        this.view.setUint32(this.pos, value >>> 0, true);
        this.pos += 4;
    }

    writeF32(value) {
        this.view.setFloat32(this.pos, Number(value || 0), true);
        this.pos += 4;
    }
}

function supports(format) {
    return FORMAT_RECORDS[format] !== undefined;
}

function canEncode(format) {
    return ENCODE_FORMATS.has(format);
}

export const PW = {
    encode,
    supports,
    canEncode,
    read,
    decodeLayer,
    encodePW0,
    decodePW0,
    formats: FORMAT_RECORDS
};
