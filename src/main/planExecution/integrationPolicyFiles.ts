import fs from "node:fs";
import path from "node:path";

/** Fixed application-owned relative paths only; bound the read even if the file grows after stat. */
export function readIntegrationPolicyFile(root: string, relativePath: string, limit: number): Buffer {
  try {
    const canonicalRoot = fs.realpathSync(root);
    if (path.resolve(root) !== canonicalRoot || fs.lstatSync(root).isSymbolicLink()) throw Error();
    const parts = relativePath.split("/");
    if (parts.some((part) => !part || part === "." || part === ".." || /[\\:]/.test(part))) throw Error();
    let target = canonicalRoot;
    for (const [index, part] of parts.entries()) {
      target = path.join(target, part);
      const stat = fs.lstatSync(target);
      if (stat.isSymbolicLink() || fs.realpathSync(target) !== target || (index < parts.length - 1 ? !stat.isDirectory() : !stat.isFile() || stat.size > limit)) throw Error();
    }
    const before = fs.lstatSync(target);
    const fd = fs.openSync(target, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW ?? 0) | (fs.constants.O_NONBLOCK ?? 0));
    try {
      const opened = fs.fstatSync(fd);
      if (!opened.isFile() || opened.size > limit || opened.dev !== before.dev || opened.ino !== before.ino) throw Error();
      const buffer = Buffer.alloc(limit + 1);
      let count = 0;
      while (count < buffer.length) {
        const read = fs.readSync(fd, buffer, count, buffer.length - count, null);
        if (!read) break;
        count += read;
      }
      const after = fs.lstatSync(target);
      if (count > limit || after.isSymbolicLink() || after.dev !== opened.dev || after.ino !== opened.ino || fs.realpathSync(target) !== target) throw Error();
      return buffer.subarray(0, count);
    } finally { fs.closeSync(fd); }
  } catch {
    throw Error("Integration configuration is missing, redirected, unreadable, or exceeds its ordinary-file bound.");
  }
}
