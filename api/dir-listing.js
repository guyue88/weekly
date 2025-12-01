import { promises as fs } from "fs";
import path from "path";

const minimalMime = (p) => {
  const ext = path.extname(p).toLowerCase();
  switch (ext) {
    case ".html": case ".htm": return "text/html; charset=utf-8";
    case ".css": return "text/css; charset=utf-8";
    case ".js": return "application/javascript; charset=utf-8";
    case ".json": return "application/json; charset=utf-8";
    case ".png": return "image/png";
    case ".jpg": case ".jpeg": return "image/jpeg";
    case ".gif": return "image/gif";
    case ".svg": return "image/svg+xml";
    default: return "application/octet-stream";
  }
};

const escapeHtml = (s) => String(s).replace(/[&<>"']/g, c => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;" }[c]));

export default async function handler(req, res) {
  try {
    // path from rewrite: "" or "a.html" or "subdir/file.txt"
    let reqPath = req.query.path || "";
    reqPath = String(reqPath).replace(/^\/+|\/+$/g, "");

    // base directory we want to serve — 指向项目内的 weekly 文件夹
    const baseDir = path.join(process.cwd(), "weekly");
    const fullPath = path.join(baseDir, reqPath);

    // 防止越界（路径穿越）
    if (!fullPath.startsWith(baseDir)) {
      res.status(400).send("Bad request");
      return;
    }

    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      // 列目录
      const dirents = await fs.readdir(fullPath, { withFileTypes: true });
      dirents.sort((a, b) => {
        if (a.isDirectory() && !b.isDirectory()) return -1;
        if (!a.isDirectory() && b.isDirectory()) return 1;
        return a.name.localeCompare(b.name);
      });

      const parts = reqPath === "" ? [] : reqPath.split("/").filter(Boolean);
      let breadcrumb = `<a href="/weekly">weekly</a>`;
      let acc = "";
      for (const p of parts) {
        acc = acc ? `${acc}/${p}` : p;
        breadcrumb += ` / <a href="/weekly/${acc}">${escapeHtml(p)}</a>`;
      }

      const listItems = dirents.map(d => {
        const name = d.name;
        const href = reqPath ? `/weekly/${reqPath}/${name}` : `/weekly/${name}`;
        return `<li><a href="${href}">${escapeHtml(name)}${d.isDirectory() ? "/" : ""}</a></li>`;
      }).join("\n");

      const html = `<!doctype html>
<html><head><meta charset="utf-8"><title>Index of /${escapeHtml(reqPath)}</title>
<style>body{font-family:Arial;margin:32px}h1{font-size:32px}ul{list-style:none;padding:0}li{margin:6px 0}a{color:#0a58ca}</style>
</head><body>
  <h1>Index of /${escapeHtml(reqPath)}</h1>
  <div style="margin-bottom:12px">${breadcrumb}</div>
  <ul>${listItems}</ul>
</body></html>`;

      res.setHeader("content-type", "text/html; charset=utf-8");
      res.status(200).send(html);
      return;
    } else {
      // 返回文件（二进制也支持）
      const data = await fs.readFile(fullPath);
      res.setHeader("content-type", minimalMime(fullPath));
      res.status(200).send(data);
      return;
    }
  } catch (err) {
    // 在开发阶段把错误打印到日志，帮助排查（部署后可改为更友好的提示）
    console.error("dir-listing error:", err && err.stack ? err.stack : err);
    // 404 更清晰
    if (err && err.code === "ENOENT") {
      res.status(404).send("Not found");
    } else {
      res.status(500).send("Internal server error");
    }
  }
}
