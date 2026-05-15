/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

const FAMILY = "Photon Workshop";

function encode(format) {
    return Promise.reject(new Error([
        `${FAMILY} format .${format} is registered but not implemented.`,
        "Add a fixture sliced by Photon Workshop before enabling this output target."
    ].join(" ")));
}

export const PW = {
    encode
};
