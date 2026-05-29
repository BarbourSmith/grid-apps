/** Copyright Stewart Allen <sa@grid.space> -- All Rights Reserved */

module.exports = function(server) {
    const { api, handler, util } = server;
    const transfers = new Map();
    const ttl = 10 * 60 * 1000;
    const maxBytes = 200 * 1024 * 1024;

    setInterval(purge, ttl / 2).unref?.();

    api.cam_anim = (req, res, next) => {
        handler.addCORS(req, res);
        res.setHeader("Cache-Control", "no-cache, no-store, private");

        if (req.method === "POST") {
            return handler.decodePost(req, res, () => {
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

                    transfers.set(key, {
                        created: Date.now(),
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
            let url = new URL(req.url, "http://localhost");
            let key = url.searchParams.get("key") || "";
            let rec = transfers.get(key);

            res.setHeader("Content-Type", "application/json");

            if (!rec) {
                res.writeHead(404, "Not Found");
                return res.end(JSON.stringify({ error: "missing transfer" }));
            }

            transfers.delete(key);
            return res.end(JSON.stringify(rec.payload));
        }

        next();
    };

    function purge() {
        let now = Date.now();

        for (let [ key, rec ] of transfers) {
            if (now - rec.created > ttl) {
                transfers.delete(key);
            }
        }
    }
};
