/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

import { util } from '../../../../geo/base.js';
import { slicer } from '../../../../geo/slicer.js';
import { newPoint } from '../../../../geo/point.js';
import { newPolygon } from '../../../../geo/polygon.js';
import { polygons as POLY } from '../../../../geo/polygons.js';
import { newSlice, newTop } from '../../../core/slice.js';
import { layerProcessTops, layerDiff, projectFlats, projectBridges } from '../../fdm/work/slice.js';
import { PNG } from '../../../../ext/pngjs.esm.js';
import { SLA } from './init-work.js';

const tracker = util.pwait;

let fill_cache;

/**
 * DRIVER CONTRACT - runs in worker
 * @param {Object} settings
 * @param {Widget} Widget
 * @param {Function} onupdate (called with % complete and optional message)
 * @param {Function} ondone (called when complete with an array of Slice objects)
 */
export function sla_slice(settings, widget, onupdate, ondone) {
    let { minions } = self.kiri_worker,
        { process, device, controller } = settings,
        isConcurrent = controller.threaded && minions.concurrent,
        work_total,
        work_remain;

    if (SLA.legacy && !self.OffscreenCanvas) {
        return ondone("browser lacks support for OffscreenCanvas",true);
    }

    // calculate % complete and call onupdate()
    function doupdate(work, msg) {
        onupdate(0.25 + ((work_total - work_remain) / work_total) * 0.75, msg);
        work_remain -= work;
    }

    // for each slice, perform a function and call doupdate()
    function forSlices(slices, work, fn, msg) {
        slices.forEach(function(slice,index) {
            fn(slice,index);
            doupdate(work / slices.length, msg)
        });
    }

    let smallDims = { x: 200, y: 125 };
    let largeDims = { x: 400, y: 300 };

    switch (device.deviceName) {
        case 'Anycubic.Photon':
        case 'Anycubic.Photon.S':
            // defaults above
            break;
        case 'Creality.Halot.One':
        case 'Creality.Halot.Max':
        case 'Creality.Halot.Sky':
            smallDims = { x: 116, y: 116 };
            largeDims = { x: 290, y: 290 };
            break;
    }

    let sws = self.kiri_worker.current.snap.url;
    let b64 = atob(sws.substring(sws.indexOf(',') + 1));
    let bin = Uint8Array.from(b64, c => c.charCodeAt(0));
    let img = new PNG();
    img.parse(bin, (err, data) => {
        SLA.preview = img;
        SLA.previewSmall = samplePNG(img, smallDims.x, smallDims.y);
        SLA.previewLarge = samplePNG(img, largeDims.x, largeDims.y);
    });
    let height = process.slaSlice || 0.05;

    async function onSliceDone(slices) {
        // remove empty slices
        slices = widget.slices = slices.filter(slice => slice.tops.length);
        if (!process.slaOpenTop && !process.xray) {
            // re-add last empty slice for closed top
            let cap = newSlice(bounds.max.z + height);
            cap.index = slices.last().index + 1;
            slices.push(cap);
        }
        // prepend raft layers to slices array
        if (process.slaSupportEnable && process.slaSupportLayers) {
            let layers = process.slaSupportLayers,
                zoff = height / 2,
                snew = [],
                polys = [],
                gap = process.slaSupportGap, // gap layers above raft
                grow = height, // union per layer expand
                off = 1 - (layers * grow); // starting union offset from part
            let outer = slices.forEach(slice => {
                // poly.clone prevents inner voids from forming
                polys.appendAll(slice.tops.map(t => t.poly.clone()));
            });
            // p.clone prevents inner voids from forming
            let union = POLY.union(polys, undefined, true).map(p => p.clone());
            let expand = POLY.expand(union, off, zoff, [], 1);
            let lastraft;
            for (let s=0; s<layers + gap; s++) {
                let slice = newSlice(zoff);
                slice.height = height;
                slice.index = snew.length;
                if (s < layers) {
                    slice.synth = true;
                    expand.forEach(u => {
                        slice.tops.push(newTop(u.clone(true).setZ(zoff)));
                    });
                    expand = POLY.expand(expand, grow, zoff, [], 1);
                    lastraft = slice;
                }
                snew.push(slice);
                zoff += height;
            }
            // compensate for midline start
            zoff -= height / 2;
            // replace slices with new appended array
            slices = widget.slices = snew.concat(slices.map(s => {
                s.tops.forEach(t => t.poly.setZ(s.z + zoff));
                s.index += snew.length;
                s.z += zoff;
                return s;
            }));
            // annotate widget for support generation
            widget.union = union;
            widget.lastraft = lastraft;
        }
        // keep logical slice indices aligned with array positions. newSlice()
        // defaults index to 0, and support routing addresses widget.slices[index].
        slices.forEach((slice, index) => {
            slice.index = index;
        });
        // re-connect slices into linked list for island/bridge projections
        for (let i=1; i<slices.length; i++) {
            slices[i-1].up = slices[i];
            slices[i].down = slices[i-1];
        }
        let solidLayers = Math.round(process.slaShell / process.slaSlice);
        // setup solid fill
        slices.forEach(function(slice) {
            slice.solids = [];
        });
        // compute total work for progress bar
        work_total = [
            5,  // shell
            10, // diff
            solidLayers ? 10 : 0, // shell project
            solidLayers ? 10 : 0, // shell fill
            !solidLayers ? 10 : 0, // solid
            process.slaFillDensity && process.slaShell ? 60 : 0, // infill
            process.slaSupportEnable && process.slaSupportLayers && process.slaSupportDensity ? 100 : 0
        ].reduce((t,v) => { return t+v });
        work_remain = work_total;
        forSlices(slices, 5, (slice,index) => {
            if (process.slaShell) {
                layerProcessTops(slice, 2, 0, process.slaShell);
            } else {
                layerProcessTops(slice, 1, 0);
            }
        }, "shells");
        forSlices(slices, 10, (slice) => {
            if (slice.synth) return;
            layerDiff(slice, {
                sla: true,
                area: 0.000001,
                thick: 0,
                fakedown: !process.slaOpenBase
            });
        }, "delta");
        if (solidLayers) {
            forSlices(slices, 10, (slice) => {
                if (slice.synth) return;
                projectFlats(slice, solidLayers);
                projectBridges(slice, solidLayers);
            }, "project");
            async function doUnionSolid(slice) {
                if (slice.synth) return;
                let traces = POLY.nest(POLY.flatten(slice.topShells()));
                if (slice.solids) {
                    let trims = slice.solids || [];
                    traces.appendAll(trims);
                    // slice.unioned = POLY.setZ(POLY.union(traces, undefined, true), slice.z);
                    slice.unioned = POLY.setZ(await minions.union(traces), slice.z);
                } else {
                    slice.unioned = traces;
                }
            }
            let promises = slices.map(slice => doUnionSolid(slice));
            await tracker(promises, (i, t) => {
                doupdate(10 / promises.length, "solid");
            });
        } else {
            forSlices(slices, 10, (slice) => {
                if (slice.synth) return;
                slice.unioned = slice.topPolys();
            }, "solid");
        }
        if (process.slaFillDensity && process.slaShell) {
            fill_cache = [];
            forSlices(slices, 60, (slice) => {
                if (slice.synth) return;
                fillPolys(slice, settings);
            }, "infill");
        }
        if (process.slaSupportEnable && process.slaSupportLayers && process.slaSupportDensity) {
            computeSupports(widget, process, progress => {
                doupdate(100 * progress, "support");
            });
        }
        doRender(widget);
    }

    let bounds = widget.getBoundingBox();
    let points = widget.getPoints();

    if (isConcurrent) {
        minions.setPoints(points);
    }

    slicer.slice(points, {
        indices: process.indices || process.xray,
        union: controller.healMesh,
        debug: process.xray,
        xray: process.xray,
        zMin: bounds.min.z + height / 2,
        zMax: bounds.max.z,
        zInc: height,
        // slicer function (worker local or minion distributed)
        slicer(z, points, opts) {
            return (isConcurrent ? minions.sliceZ : slicer.sliceZ)(z, points, opts);
        },
        onupdate(v) {
            return onupdate(0.0 + v * 0.25);
        }
    }).then(output => {
        let slices = widget.slices = output.slices.map(data => {
            let { z, lines, groups } = data;
            let tops = POLY.nest(groups);
            return newSlice(z).addTops(tops);
        });
        onSliceDone(slices).then(ondone);
        minions.setPoints([]);
    });
};

function doRender(widget) {
    widget.slices.forEach(slice => {
        const render = slice.output(), lopacity = 0.6, line = 0x010101;

        if (slice.unioned) {
            slice.unioned.forEach(poly => {
                poly = poly.clone(true);//.move(widget.track.pos);
                render
                    .setLayer("layers", { line, face: 0x0099cc, lopacity })
                    .addAreas([poly], { outline: true });
            });
        } else if (slice.tops) {
            slice.tops.forEach(top => {
                let poly = top.poly;//.clone(true).move(widget.track.pos);
                render
                    .setLayer("layers", { line, face: 0xfcba03, lopacity })
                    .addAreas([poly], { outline: true });
            });
        }

        if (slice.supports) {
            slice.supports.forEach(poly => {
                render
                    .setLayer("support", { line, face: 0xfcba03, lopacity })
                    .addAreas([poly], { outline: true });
            });
        }
    });
}

function computeSupports(widget, process, progress) {
    let slices = widget.slices,
        baseIndex = widget.lastraft ? widget.lastraft.index : 0,
        spacing = supportSpacing(process),
        points = Math.bound(process.slaSupportPoints || 8, 5, 16),
        tipRadius = Math.bound(process.slaSupportSize * 0.35, 0.12, 0.45),
        branchRadius = Math.bound(process.slaSupportSize * 0.55, tipRadius, 0.75),
        trunkRadius = Math.bound(process.slaSupportSize * 0.85, branchRadius, 1.25),
        segmentLayers = Math.max(4, Math.round(2 / process.slaSlice)),
        contacts = collectSupportContacts(slices, process, spacing, tipRadius),
        levels = new Map();

    slices.forEach(slice => {
        delete slice.supports;
        delete slice.pillars;
    });

    contacts.sort((a, b) => {
        if (b.slice.index !== a.slice.index) return b.slice.index - a.slice.index;
        return b.area - a.area;
    });

    if (contacts.length === 0) {
        progress(1);
        return;
    }

    contacts.forEach(contact => {
        routeSupportTree({
            slices,
            baseIndex,
            levels,
            contact,
            process,
            points,
            tipRadius,
            branchRadius,
            trunkRadius,
            segmentLayers,
            spacing
        });
        progress(1 / contacts.length);
    });
}

function collectSupportContacts(slices, process, spacing, tipRadius) {
    let contacts = [],
        minArea = Math.max(0.01, tipRadius * tipRadius),
        minDist = Math.max(tipRadius * 2.25, spacing * 0.35);

    slices.forEach(slice => {
        if (slice.synth || !slice.bridges?.length) return;

        let points = [],
            bridges = unsupportedBridgePolys(slice, process, minArea);

        bridges.forEach(poly => {
            if (poly.areaDeep() < minArea) return;
            sampleBridgePolygon(poly, slice.z, spacing, points);
        });

        points = dedupePoints(points, minDist);
        points.forEach(point => {
            contacts.push({
                slice,
                point,
                area: point.supportArea || 0
            });
        });
    });

    return contacts;
}

function unsupportedBridgePolys(slice, process, minArea) {
    if (!slice.down?.tops?.length) return slice.bridges;

    let selfSupport = supportSelfDistance(process),
        lower = POLY.expand(slice.down.topPolys().clone(true), selfSupport, slice.z, [], 1, undefined, undefined, minArea);

    if (!lower.length) return slice.bridges;

    let unsupported = [];
    POLY.subtract(slice.bridges, lower, unsupported, null, slice.z, minArea, { wasm: true });
    return unsupported;
}

function supportSelfDistance(process) {
    return Math.max(
        process.slaSlice * 1.25,
        process.slaSupportSize * 0.08
    );
}

function sampleBridgePolygon(poly, z, spacing, points) {
    let flats = poly.clone(true).flattenTo([]),
        emitted = 0;

    flats.forEach(flat => {
        let area = flat.areaDeep(),
            center = flat.center();

        if (center && center.isInPolygon(flat)) {
            center.z = z;
            center.supportArea = area;
            points.push(center);
            emitted++;
        }

        flat.forEachSegment((p1, p2) => {
            let dist = p1.distTo2D(p2);
            if (dist <= 0) return;

            let count = Math.max(1, Math.ceil(dist / spacing));
            for (let i=0; i<count; i++) {
                let point = p1.offsetPointTo(p2, (dist * (i + 0.5)) / count);
                point.z = z;
                point.supportArea = area;
                points.push(point);
                emitted++;
            }
        });
    });

    if (!emitted && poly.length) {
        let center = poly.center();
        center.z = z;
        center.supportArea = poly.areaDeep();
        points.push(center);
    }
}

function routeSupportTree(args) {
    let {
        slices, baseIndex, levels, contact, process, points,
        tipRadius, branchRadius, trunkRadius, segmentLayers, spacing
    } = args;
    let current = {
        sliceIndex: contact.slice.index,
        point: contact.point,
        radius: tipRadius
    };

    while (current.sliceIndex > baseIndex) {
        let nextIndex = nextSupportLevel(current.sliceIndex, baseIndex, segmentLayers),
            depth = (contact.slice.index - nextIndex) / Math.max(contact.slice.index - baseIndex, 1),
            vertical = (current.sliceIndex - nextIndex) * process.slaSlice,
            maxMove = maxTreeMove(vertical),
            radius = lerp(branchRadius, trunkRadius, depth),
            target = {
                sliceIndex: nextIndex,
                point: treeTargetPoint(current.point, contact.point, depth, spacing, maxMove),
                radius
            },
            fit = fitSegmentTarget(slices, current, target, radius, contact.slice.index, maxMove),
            mergeSearch = mergeSearchRadius(spacing, radius, depth, maxMove),
            merge = findMergeNode(levels, nextIndex, fit.point, mergeSearch);

        target.point = fit.point;

        if (merge && current.point.distTo2D(merge.point) <= maxMove) {
            let mergeCollisions = segmentCollisions(slices, current, merge,
                Math.max(radius, merge.radius), contact.slice.index);

            if (mergeCollisions === 0) {
                target = merge;
                target.merged = true;
                target.radius = Math.max(target.radius, radius);
            } else {
                addLevelNode(levels, target);
            }
        } else {
            addLevelNode(levels, target);
        }

        emitSupportSegment({
            slices,
            points,
            from: current,
            to: target
        });

        if (target.merged) {
            break;
        }

        current = target;
    }
}

function emitSupportSegment(args) {
    let { slices, points, from, to } = args,
        span = Math.max(1, from.sliceIndex - to.sliceIndex);

    for (let index=from.sliceIndex; index>=to.sliceIndex; index--) {
        let t = (from.sliceIndex - index) / span,
            slice = slices[index],
            radius = lerp(from.radius, to.radius, t),
            point = interpolatePoint(from.point, to.point, t, slice.z);

        addSupportCircle(slice, point, radius, points);
    }
}

function addSupportCircle(slice, point, radius, points) {
    let support = newPolygon()
        .centerCircle(point, radius, points, true)
        .setZ(slice.z);
    if (!slice.supports) slice.supports = [];
    slice.supports.push(support);
}

function findMergeNode(levels, sliceIndex, point, radius) {
    let nodes = levels.get(sliceIndex);
    if (!nodes) return;

    let best, bestDist = Infinity;
    for (let node of nodes) {
        let dist = point.distTo2D(node.point);
        if (dist < bestDist && dist <= radius) {
            best = node;
            bestDist = dist;
        }
    }
    return best;
}

function addLevelNode(levels, node) {
    let nodes = levels.get(node.sliceIndex);
    if (!nodes) levels.set(node.sliceIndex, nodes = []);
    nodes.push(node);
}

function nextSupportLevel(currentIndex, baseIndex, segmentLayers) {
    let aboveBase = currentIndex - baseIndex;
    if (aboveBase <= segmentLayers) return baseIndex;
    return baseIndex + Math.floor((aboveBase - 1) / segmentLayers) * segmentLayers;
}

function supportCollides(slice, point, radius) {
    if (slice.synth || !slice.tops?.length) return false;
    let radius2 = radius * radius;
    return slice.tops.some(top => {
        let poly = top.poly;
        return point.isInPolygon(poly) || point.nearPolygon(poly, radius2, true);
    });
}

function fitSegmentTarget(slices, from, to, radius, contactIndex, maxMove) {
    let candidates = segmentTargetCandidates(from.point, to.point, maxMove),
        best = to.point,
        bestCollisions = Infinity,
        bestScore = Infinity;

    for (let candidate of candidates) {
        let fit = {
            sliceIndex: to.sliceIndex,
            point: candidate,
            radius: to.radius
        };
        let collisions = segmentCollisions(slices, from, fit, radius, contactIndex);
        let score = collisions * 10000 + to.point.distTo2D(candidate) * 10 + from.point.distTo2D(candidate);
        if (collisions < bestCollisions || (collisions === bestCollisions && score < bestScore)) {
            best = candidate;
            bestCollisions = collisions;
            bestScore = score;
            if (collisions === 0) break;
        }
    }

    return {
        point: best,
        collisions: bestCollisions
    };
}

function segmentTargetCandidates(from, point, maxMove) {
    let out = [
            point,
            newPoint(from.x, from.y, point.z)
        ],
        dirs = [
            [1, 0], [-1, 0], [0, 1], [0, -1],
            [0.707, 0.707], [-0.707, 0.707],
            [0.707, -0.707], [-0.707, -0.707]
        ];

    for (let scale of [0.5, 1]) {
        let dist = maxMove * scale;
        for (let dir of dirs) {
            out.push(newPoint(
                point.x + dir[0] * dist,
                point.y + dir[1] * dist,
                point.z
            ));
        }
    }

    return out;
}

function mergeSearchRadius(spacing, radius, depth, maxMove) {
    return Math.max(
        radius * 2,
        Math.min(spacing * (0.35 + depth * 0.65), maxMove)
    );
}

function segmentCollisions(slices, from, to, radius, contactIndex) {
    let span = Math.max(1, from.sliceIndex - to.sliceIndex),
        collisions = 0;

    for (let index=from.sliceIndex; index>=to.sliceIndex; index--) {
        if (index >= contactIndex - 2) continue;
        let slice = slices[index],
            t = (from.sliceIndex - index) / span,
            point = interpolatePoint(from.point, to.point, t, slice.z);
        if (supportCollides(slice, point, radius)) {
            collisions++;
        }
    }

    return collisions;
}

function supportSpacing(process) {
    return Math.max(
        process.slaSupportSize * 2.5,
        2 + (1 - process.slaSupportDensity) * 8
    );
}

function maxTreeMove(vertical) {
    // Keep branches printable by capping horizontal drift to about 18 degrees.
    return Math.max(0.05, vertical * 0.3249);
}

function dedupePoints(points, minDist) {
    let out = [];
    points.sort((a, b) => (b.supportArea || 0) - (a.supportArea || 0));
    points.forEach(point => {
        if (!out.some(existing => existing.distTo2D(point) < minDist)) {
            out.push(point);
        }
    });
    return out;
}

function treeTargetPoint(point, _origin, depth, spacing, maxMove) {
    let grid = spacing * (2 + depth * 3),
        target = {
            x: Math.round(point.x / grid) * grid,
            y: Math.round(point.y / grid) * grid
        },
        blend = Math.min(0.5, 0.12 + depth * 0.35);

    return limitTreeMove(point, newPoint(
        lerp(point.x, target.x, blend),
        lerp(point.y, target.y, blend),
        point.z
    ), maxMove);
}

function limitTreeMove(from, to, maxMove) {
    let dist = from.distTo2D(to);
    if (dist <= maxMove) return to;
    return from.offsetPointTo(to, maxMove);
}

function interpolatePoint(from, to, t, z) {
    return newPoint(
        lerp(from.x, to.x, t),
        lerp(from.y, to.y, t),
        z
    );
}

function lerp(a, b, t) {
    return a + (b - a) * t;
}

function fillPolys(slice, settings) {
    let process = settings.process,
        device = settings.device,
        polys = slice.unioned,
        bounds = settings.bounds,
        width = bounds.max.x - bounds.min.x,
        depth = bounds.max.y - bounds.min.y,
        max = Math.max(width,depth),
        seq = Math.round(process.slaFillLine / process.slaSlice),
        linew = process.slaFillLine,
        units_w = (width / linew) * process.slaFillDensity,
        units_d = (depth / linew) * process.slaFillDensity,
        step_x = width / units_w,
        step_y = depth / units_d,
        start_x = -(width / 2),
        start_y = -(depth / 2),
        end_x = width / 2,
        end_y = depth / 2,
        fill = [];

    let seq_i = Math.floor(slice.index / seq),
        seq_c = seq_i % 4,
        cached = fill_cache[seq_c];

    if (!cached && seq_c !== 1)
    for (let x=start_x; x<end_x; x += step_x) {
        fill.push(
            newPolygon().centerRectangle({
                x: x + step_x/2,
                y: 0,
                z: slice.z
            }, linew, depth)
        );
    }

    if (!cached && seq_c !== 3)
    for (let y=start_y; y<end_y; y += step_y) {
        fill.push(
            newPolygon().centerRectangle({
                x: 0,
                y: y + step_y/2,
                z: slice.z
            }, width, linew)
        );
    }

    if (!cached) {
        fill = POLY.union(fill, 0, true);
        fill_cache[seq_c] = fill;
    } else {
        fill = cached.slice().map(p => p.clone(true).setZ(slice.z));
    }

    fill = POLY.trimTo(fill, slice.tops.map(t => t.poly));
    fill = POLY.union(slice.unioned.appendAll(fill), 0, true);

    slice.unioned = fill;
}

function pixAt(png,x,y) {
    let idx = (x + png.width * y) * 4;
    let dat = png.data;
    return [
        dat[idx++],
        dat[idx++],
        dat[idx++],
        dat[idx++]
    ];
}

function averageBlock(png,x1,y1,x2,y2) {
    let val = [0, 0, 0, 0], count = 0, x, y, z, v2;
    for (x=x1; x<x2; x++) {
        for (y=y1; y<y2; y++) {
            v2 = pixAt(png,x,y);
            for (z=0; z<4; z++) {
                val[z] += v2[z];
            }
            count++;
        }
    }
    for (z=0; z<4; z++) {
        val[z] = Math.abs(val[z] / count);
    }
    return val;
};

function samplePNG(png, width, height) {
    let th = width, tw = height,
        aspect = width / height, // was fixed at 4/3 for photon
        ratio = png.width / png.height,
        buf = new Uint8Array(th * tw * 4),
        div, xoff, yoff, dx, ex, dy, ey, bidx, pixval;

    if (ratio >= aspect) {
        div = png.height / tw;
        xoff = Math.round((png.width - (th * div)) / 2);
        yoff = 0;
    } else {
        div = png.width / th;
        xoff = 0;
        yoff = Math.round((png.height - (tw * div)) / 2);
    }

    for (let y=0; y<tw; y++) {
        dy = Math.round(y * div + yoff);
        if (dy < 0 || dy > png.height) continue;
        ey = Math.round((y+1) * div + yoff);
        for (let x=0; x<th; x++) {
            dx = Math.round(x * div + xoff);
            if (dx < 0 || dx > png.width) continue;
            ex = Math.round((x+1) * div + xoff);
            bidx = (y * th + x) * 4;
            pixval = averageBlock(png,dx,dy,ex,ey);
            buf[bidx+0] = pixval[0];
            buf[bidx+1] = pixval[1];
            buf[bidx+2] = pixval[2];
            buf[bidx+3] = pixval[3];
        }
    }

    return {width, height, data:buf, png};
}
