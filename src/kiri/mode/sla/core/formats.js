/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

const DEVICE_FORMAT = {
    'Anycubic.Photon': 'photon',
    'Anycubic.Photon.S': 'photons'
};

export const SLA_FORMATS = {
    photon: {
        id: 'photon',
        ext: 'photon',
        proprietary: true,
        available: true
    },
    photons: {
        id: 'photons',
        ext: 'photons',
        proprietary: true,
        available: true
    },
    cxdlp: {
        id: 'cxdlp',
        ext: 'cxdlp',
        proprietary: true,
        available: true
    },
    vsla: {
        id: 'vsla',
        ext: 'vsla',
        proprietary: false,
        available: true,
        editableMachine: true
    },
    rsla: {
        id: 'rsla',
        ext: 'rsla',
        proprietary: false,
        available: true,
        editableMachine: true
    },
    ctb: {
        id: 'ctb',
        ext: 'ctb',
        proprietary: true,
        available: true,
        priority: 1,
        family: 'chitubox'
    }
};

export function getSLAFormat(device) {
    return device.slaFormat || DEVICE_FORMAT[device.deviceName] || 'cxdlp';
}

export function getSLAFormatRecord(device) {
    let id = getSLAFormat(device);
    return SLA_FORMATS[id] || SLA_FORMATS.cxdlp;
}

export function getSLAFileExt(device) {
    let rec = getSLAFormatRecord(device);
    return device.slaFileExt || rec.ext || rec.id;
}

export function canEditSLAMachine(device) {
    return device.slaMachineEditable === true ||
        getSLAFormatRecord(device).editableMachine === true;
}
