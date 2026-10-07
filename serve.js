// Minimal zero-dependency static file server for the farm game
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = 8123;
const MIME = {
  ".html": "text/html", ".css": "text/css", ".js": "text/javascript",
  ".png": "image/png", ".json": "application/json", ".ico": "image/x-icon",
};

http.createServer((req, res) => {
  // Dev helper: POST base64 PNG to /shot -> saved as shot.png next to the game
  if (req.method === "POST" && req.url === "/shot") {
    let body = "";
    req.on("data", (d) => { body += d; });
    req.on("end", () => {
      fs.writeFileSync(path.join(ROOT, "shot.png"), Buffer.from(body, "base64"));
      res.writeHead(200); res.end("saved");
    });
    return;
  }
  let urlPath = decodeURIComponent(req.url.split("?")[0]);
  if (urlPath === "/") urlPath = "/index.html";
  const file = path.normalize(path.join(ROOT, urlPath));
  if (!file.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (err, data) => {
    if (err) { res.writeHead(404); res.end("Not found"); return; }
    res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
    res.end(data);
  });
}).listen(PORT, () => console.log("Farm game running at http://localhost:" + PORT));
