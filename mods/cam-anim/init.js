/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

module.exports = function(server) {
    const { api, handler, util } = server;
    const store = server.store;
    const prefix = "/cam-anim/";
    const ttl = 10 * 60 * 1000;
    const maxBytes = 200 * 1024 * 1024;

    setInterval(() => purge().catch(error => {
        util.log({ cam_anim_purge_error: error.message || String(error) });
    }), ttl / 2).unref?.();

    api.cam_anim = (req, res, next) => {
        handler.addCORS(req, res);
        res.setHeader("Cache-Control", "no-cache, no-store, private");

        if (req.method === "POST") {
            return handler.decodePost(req, res, async () => {
                let post = req.app.post;
                let bytes = Buffer.isBuffer(post) ? post.length : Buffer.byteLength(post || "");

                if (bytes > maxBytes) {
                    res.writeHead(413, "Payload Too Large");
                    return res.end(JSON.stringify({ error: "payload too large" }));
                }

                try {
                    let payload = JSON.parse(post);
                    let url = new URL(req.url, "http://localhost");
                    let key = url.searchParams.get("key") || util.guid().replace(/-/g, "");

                    if (!/^[a-z0-9]{24,64}$/i.test(key)) {
                        res.writeHead(400, "Bad Request");
                        return res.end(JSON.stringify({ error: "invalid transfer key" }));
                    }

                    await (await store).put(path(key), {
                        created: Date.now(),
                        bytes,
                        payload
                    });
                    res.setHeader("Content-Type", "application/json");
                    res.end(JSON.stringify({ key, bytes }));
                } catch (error) {
                    res.writeHead(400, "Bad Request");
                    res.end(JSON.stringify({ error: error.message || String(error) }));
                }
            });
        }

        if (req.method === "GET") {
            return getTransfer(req, res).catch(error => {
                res.writeHead(500, "Internal Server Error");
                res.end(JSON.stringify({ error: error.message || String(error) }));
            });
        }

        next();
    };

    async function getTransfer(req, res) {
        let url = new URL(req.url, "http://localhost");
        let key = url.searchParams.get("key") || "";
        let db = await store;
        let rec = await db.get(path(key));

        res.setHeader("Content-Type", "application/json");

        if (!rec) {
            res.writeHead(404, "Not Found");
            return res.end(JSON.stringify({ error: "missing transfer" }));
        }

        await db.del(path(key));

        if (Date.now() - rec.created > ttl) {
            res.writeHead(404, "Not Found");
            return res.end(JSON.stringify({ error: "expired transfer" }));
        }

        return res.end(JSON.stringify(rec.payload));
    }

    async function purge() {
        let db = await store;
        let now = Date.now();
        let stale = [];

        await db.list({ pre: prefix }, (key, rec) => {
            if (now - rec?.created > ttl) {
                stale.push(key);
            }
        });

        for (let key of stale) {
            await db.del(key);
        }
    }

    function path(key) {
        return `${prefix}${key}`;
    }
};
