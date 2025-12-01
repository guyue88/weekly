import { promises as fs } from "fs";
import path from "path";

export default async function handler(req, res) {
  const reqPath = req.query.path || "";
  const safePath = reqPath.replace(/\/$/, ""); // 防止末尾/
  const fullPath = path.join(process.cwd(), safePath);

  try {
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      const files = await fs.readdir(fullPath);

      return res.send(`
        <h1>Index of /${safePath}</h1>
        <ul>
        ${files
          .map(f => `<li><a href="/${safePath}/${f}">${f}</a></li>`)
          .join("")}
        </ul>
      `);
    } else {
      return res.sendFile(fullPath);
    }
  } catch {
    return res.status(404).send("Not found");
  }
}
