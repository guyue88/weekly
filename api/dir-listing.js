import { promises as fs } from "fs";
import path from "path";
import mime from "mime"; // note: Vercel environment includes node modules? If not, we'll fallback below

const CONTENT_TYPE = (filePath) => {
  try {
    // attempt mime from package if available
    return mime.getType(filePath) || "application/octet-stream";
  } catch (e) {
    // fallback minimal map
    const ext = path.extname(filePath).toLowerCase();
    const map = {
      ".html": "text/html; charset=utf-8",
      ".htm": "text/html; charset=utf-8",
      ".css": "text/css; charset=utf-8",
      ".js": "application/javascript; charset=utf-8",
      ".json": "application/json; charset=utf-8",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml"
    };
    return map[ext] || "application/octet-stream";
  }
};

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));
}

export default async function handler(req, res) {
  // path from rewrite: e.g. "weekly" or "weekly/a.html" or ""
  let reqPath = req.query.path || "";
  // normalize: remove leading/trailing slashes
  reqPath = String(reqPath).replace(/^\/+|\/+$/g, "");

  // base directory relative to project root where your static files live
  // If you want everything from project root, set baseDir = process.cwd()
  const baseDir = path.join(process.cwd());
  // resolve and prevent path traversal
  const fullPath = path.join(baseDir, reqPath);

  // sanity: ensure the requested path is inside baseDir
  if (!fullPath.startsWith(baseDir)) {
    res.status(400).send("Bad request");
    return;
  }

  try {
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      // list files
      let files = await fs.readdir(fullPath, { withFileTypes: true });

      // sort directories first then files, alphabetically
      files = files.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      // build breadcrumb
      const parts = reqPath === "" ? [] : reqPath.split("/").filter(Boolean);
      let breadcrumb = `<a href="/">root</a>`;
      let acc = "";
      for (const p of parts) {
        acc = acc ? `${acc}/${p}` : p;
        breadcrumb += ` / <a href="/${acc}">${escapeHtml(p)}</a>`;
      }

      const listItems = files
        .map((f) => {
          const name = f.name;
          const href = reqPath ? `/${reqPath}/${name}` : `/${name}`;
          const display = escapeHtml(name) + (f.isDirectory() ? "/" : "");
          return `<li><a href="${href}">${display}</a></li>`;
        })
        .join("\n");

      const html = `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Index of /${escapeHtml(reqPath)}</title>
  <style>
    body{font-family: Inter, Roboto, Arial;margin:36px}
    h1{font-size:36px}
    ul{list-style: none;padding-left:0}
    li{margin:6px 0}
    a{color:#0a58ca;text-decoration:underline}
    .meta{color:#666;font-size:13px;margin-bottom:12px}
  </style>
</head>
<body>
  <h1>Index of /${escapeHtml(reqPath)}</h1>
  <div class="meta">${breadcrumb}</div>
  <ul>
    ${listItems}
  </ul>
</body>
</html>`;

      res.setHeader("content-type", "text/html; charset=utf-8");
      res.status(200).send(html);
      return;
    } else {
      // it's a file: read and send with content-type
      const data = await fs.readFile(fullPath);
      res.setHeader("content-type", CONTENT_TYPE(fullPath));
      // for images/binaries, buffer will be sent OK
      res.status(200).send(data);
      return;
    }
  } catch (e) {
    // not found or other error
    res.status(404).send("Not found");
  }
}
