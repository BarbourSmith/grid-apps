/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

import { local } from '../data/local.js';
import { broker } from '../moto/broker.js';
import { js2o, o2js } from './utils.js';

class Stats {
    constructor(db) {
        this.db = db || local;
        this.obj = js2o(this.db['stats'] || '{}');
        let o = this.obj, k;
        for (k in o) {
            if (!o.hasOwnProperty(k)) continue;
            if (['dn','lo','re'].indexOf(k) >= 0 || k.indexOf('-') > 0 || k.indexOf('_') > 0) {
                delete o[k];
            }
        }
    }

    save(quiet) {
        this.db['stats'] = o2js(this.obj);
        if (!quiet) {
            broker.publish('stats', this.obj);
        }
        return this;
    }

    get(k) {
        return this.obj[k];
    }

    set(k,v,quiet) {
        this.obj[k] = v;
        this.save(quiet);
        return this;
    }

    add(k,v,quiet) {
        this.obj[k] = (this.obj[k] || 0) + (v || 1);
        this.save(quiet);
        return this;
    }

    del(k, quiet) {
        delete this.obj[k];
        this.save(quiet);
        return this;
    }
}

export const stats = new Stats();

export { stats as Stats };
