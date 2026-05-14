/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

import { JSZip } from '../../../../ext/jszip-esm.js';
import { PNG } from '../../../../ext/pngjs.esm.js';
import { photon } from './x_photon.js';

const FORMAT = "rsla";
const MIME = "application/vnd.gridspace.rsla+zip";

function encode(print, progress) {
    let { settings, widgets } = print;
    let { device, process } = settings;
    let width = device.resolutionX;
    let height = device.resolutionY;
    let scaleX = width / device.bedWidth;
    let scaleY = height / device.bedDepth;
    let layermax = 0;

    widgets = widgets.filter(w => !w.track.ignore && !w.meta.disabled);
    widgets.forEach(widget => {
        layermax = Math.max(layermax, widget.slices.length);
    });

    let layers = [];
    let volume = 0;
    let zip = new JSZip();

    for (let index=0; index<layermax; index++) {
        let rendered = photon.renderLayerWasm({
            index,
            width,
            height,
            widgets,
            scaleX,
            scaleY,
            masks: []
        });
        if (rendered.end) {
            break;
        }

        let file = `layers/${index.toString().padStart(6, "0")}.png`;
        let layer = {
            index,
            z: round(process.slaFirstOffset + process.slaSlice * index),
            area: round(rendered.area),
            file
        };

        volume += rendered.area * process.slaSlice;
        layers.push(layer);
        zip.file(file, imageToPNG(rendered.image, width, height));

        if (progress) progress((index / layermax) * 0.85, "raster_gen");
    }

    let manifest = createManifest({ device, process, layers, volume });
    zip.file("manifest.json", JSON.stringify(manifest, null, 2));

    return zip.generateAsync({
        type: "arraybuffer",
        compression: "DEFLATE",
        compressionOptions: { level: 6 },
        streamFiles: true,
        mimeType: MIME
    }, meta => {
        if (progress) progress(0.85 + (meta.percent / 100) * 0.15, "zip_gen");
    }).then(file => {
        return { file, layers: layers.length, volume };
    });
}

function createManifest(params) {
    let { device, process, layers, volume } = params;

    return {
        format: FORMAT,
        version: device.slaFormatVersion || 1,
        units: "mm",
        coordinateSystem: {
            layerImage: "top-left",
            model: "bed-center",
            x: "right",
            y: "back",
            z: "up"
        },
        bed: {
            width: device.bedWidth,
            depth: device.bedDepth,
            height: device.maxHeight || device.bedHeight
        },
        resolution: {
            x: device.resolutionX,
            y: device.resolutionY
        },
        layerHeight: process.slaSlice,
        layerCount: layers.length,
        volume: round(volume),
        raster: {
            encoding: "png",
            color: "grayscale",
            cure: "nonzero",
            white: "cure",
            black: "off"
        },
        process: {
            bottomLayers: process.slaBaseLayers,
            exposure: process.slaLayerOn,
            bottomExposure: process.slaBaseOn,
            lightOffDelay: process.slaLayerOff,
            bottomLightOffDelay: process.slaBaseOff,
            liftHeight: process.slaPeelDist,
            bottomLiftHeight: process.slaBasePeelDist,
            liftSpeed: process.slaPeelLiftRate * 60,
            bottomLiftSpeed: process.slaBasePeelLiftRate * 60,
            retractSpeed: process.slaPeelDropRate * 60,
            firstLayerOffset: process.slaFirstOffset,
            antiAlias: process.slaAntiAlias
        },
        layers
    };
}

function imageToPNG(image, width, height) {
    let data = new Uint8Array(width * height);
    for (let x=0; x<width; x++) {
        for (let y=0; y<height; y++) {
            data[y * width + x] = image[x * height + y] ? 255 : 0;
        }
    }
    return PNG.sync.write({ width, height, data }, {
        colorType: 0,
        inputColorType: 0,
        inputHasAlpha: false
    });
}

function round(value) {
    return Number.parseFloat(Number(value || 0).toFixed(5));
}

export const RSLA = {
    encode
};
