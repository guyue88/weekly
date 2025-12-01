import { promises as fs } from "fs";
import path from "path";

export default async function handler(req, res) {
  const reqPath = req.query.path || "";
  const fullPath = path.join(process.cwd(), reqPath);

  try {
    const stat = await fs.stat(fullPath);

    if (stat.isDirectory()) {
      const files = await fs.readdir(fullPath);
      return res.send(`
        <h1>Index of /${reqPath}</h1>
        <ul>
        ${files
          .map(f => `<li><a href="/${reqPath}/${f}">${f}</a></li>`)
          .join("")}
        </ul>
      `);
    } else {
      // serve file normally
      return res.sendFile(fullPath);
    }
  } catch (e) {
    res.status(404).send("Not found");
  }
}
