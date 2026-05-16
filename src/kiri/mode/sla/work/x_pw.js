/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

const FAMILY = "Photon Workshop";
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

function encode(format) {
    let rec = FORMAT_RECORDS[format];

    return Promise.reject(new Error([
        `${FAMILY} format .${format} is registered but not implemented.`,
        rec ? `Detected family generation: ${rec.generation} (${rec.notes}).` : "",
        "Add a known-good fixture sliced by Photon Workshop for this exact extension before enabling this output target."
    ].join(" ")));
}

function supports(format) {
    return FORMAT_RECORDS[format] !== undefined;
}

export const PW = {
    encode,
    supports,
    formats: FORMAT_RECORDS
};
