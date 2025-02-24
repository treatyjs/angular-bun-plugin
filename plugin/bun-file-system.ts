import * as p from "path";
import { fileURLToPath } from "url";

// Helper: toggle the case of a string.
function toggleCase(str: string): string {
  return str
    .split("")
    .map((ch) =>
      ch.toUpperCase() === ch ? ch.toLowerCase() : ch.toUpperCase()
    )
    .join("");
}

//
// BunPathManipulation
//
export class BunPathManipulation {
  pwd(): string {
    // Use Bun.cwd() if available, otherwise fall back to process.cwd()
    if (typeof Bun !== "undefined" && Bun.cwd) {
      return this.normalize(Bun.cwd());
    } else {
      return this.normalize(process.cwd());
    }
  }

  chdir(dir: string): void {
    // As of now Bun does not have chdir. Fall back to Node's process.chdir.
    if (typeof Bun !== "undefined" && Bun.chdir) {
      Bun.chdir(dir);
    } else {
      process.chdir(dir);
    }
  }

  resolve(...paths: string[]): string {
    return this.normalize(p.resolve(...paths));
  }

  dirname<T extends string>(file: T): T {
    return this.normalize(p.dirname(file)) as T;
  }

  join<T extends string>(basePath: T, ...paths: string[]): T {
    return this.normalize(p.join(basePath, ...paths)) as T;
  }

  isRoot(path: string): boolean {
    return this.dirname(path) === this.normalize(path);
  }

  isRooted(path: string): boolean {
    return p.isAbsolute(path);
  }

  relative(from: string, to: string): string {
    return this.normalize(p.relative(from, to));
  }

  basename(filePath: string, extension?: string): string {
    return extension
      ? p.basename(filePath, extension)
      : p.basename(filePath);
  }

  extname(path: string): string {
    return p.extname(path);
  }

  normalize<T extends string>(path: T): T {
    // Convert backslashes to forward slashes.
    return path.replace(/\\/g, "/") as T;
  }
}

//
// BunReadonlyFileSystem
//
export class BunReadonlyFileSystem extends BunPathManipulation {
  private _caseSensitive: boolean | undefined = undefined;
  private currentFileName: string;

  constructor() {
    super();
    // Determine current file using import.meta.url (ESM) fallback.
    if (typeof __filename !== "undefined") {
      this.currentFileName = __filename;
    } else {
      this.currentFileName = fileURLToPath(import.meta.url);
    }
  }

  isCaseSensitive(): boolean {
    if (this._caseSensitive === undefined) {
      // Toggle the case of the current file name: if the toggled version exists,
      // then the FS is likely case-insensitive.
      this._caseSensitive = !this.exists(
        this.normalize(toggleCase(this.currentFileName))
      );
    }
    return this._caseSensitive;
  }

  exists(path: string): boolean {
    try {
      if (typeof Bun !== "undefined" && Bun.statSync) {
        Bun.statSync(path);
      } else {
        require("fs").statSync(path);
      }
      return true;
    } catch (e) {
      return false;
    }
  }

  readFile(path: string): string {
    if (typeof Bun !== "undefined" && Bun.file) {
      return Bun.file(path).text();
    } else {
      return require("fs").readFileSync(path, "utf8");
    }
  }

  readFileBuffer(path: string): Uint8Array {
    if (typeof Bun !== "undefined" && Bun.file) {
      const buffer = Bun.file(path).arrayBuffer();
      return new Uint8Array(buffer);
    } else {
      return require("fs").readFileSync(path);
    }
  }

  readdir(path: string): string[] {
    if (typeof Bun !== "undefined" && Bun.readdirSync) {
      return Bun.readdirSync(path);
    } else {
      return require("fs").readdirSync(path);
    }
  }

  lstat(path: string): any {
    if (typeof Bun !== "undefined" && Bun.lstatSync) {
      return Bun.lstatSync(path);
    } else {
      return require("fs").lstatSync(path);
    }
  }

  stat(path: string): any {
    if (typeof Bun !== "undefined" && Bun.statSync) {
      return Bun.statSync(path);
    } else {
      return require("fs").statSync(path);
    }
  }

  realpath(path: string): string {
    if (typeof Bun !== "undefined" && Bun.realpathSync) {
      return this.resolve(Bun.realpathSync(path));
    } else {
      return this.resolve(require("fs").realpathSync(path));
    }
  }

  getDefaultLibLocation(): string {
    // For module resolution of 'typescript', use Bun.resolve if available,
    // otherwise fall back to Node's require.resolve.
    let tsPath: string;
    if (typeof Bun !== "undefined" && Bun.resolve) {
      tsPath = Bun.resolve("typescript");
    } else {
      tsPath = require.resolve("typescript");
    }
    return this.resolve(p.dirname(tsPath));
  }
}

//
// BunFileSystem
//
export class BunFileSystem extends BunReadonlyFileSystem {
  writeFile(
    path: string,
    data: string | Uint8Array,
    exclusive: boolean = false
  ): void {
    const flag = exclusive ? "wx" : "w";
    if (typeof Bun !== "undefined" && Bun.writeSync) {
      Bun.writeSync(path, data, { flag });
    } else {
      require("fs").writeFileSync(path, data, { flag });
    }
  }

  removeFile(path: string): void {
    if (typeof Bun !== "undefined" && Bun.unlinkSync) {
      Bun.unlinkSync(path);
    } else {
      require("fs").unlinkSync(path);
    }
  }

  symlink(target: string, path: string): void {
    if (typeof Bun !== "undefined" && Bun.symlinkSync) {
      Bun.symlinkSync(target, path);
    } else {
      require("fs").symlinkSync(target, path);
    }
  }

  copyFile(from: string, to: string): void {
    if (typeof Bun !== "undefined" && Bun.copyFileSync) {
      Bun.copyFileSync(from, to);
    } else {
      require("fs").copyFileSync(from, to);
    }
  }

  moveFile(from: string, to: string): void {
    if (typeof Bun !== "undefined" && Bun.renameSync) {
      Bun.renameSync(from, to);
    } else {
      require("fs").renameSync(from, to);
    }
  }

  ensureDir(path: string): void {
    if (typeof Bun !== "undefined" && Bun.mkdirSync) {
      Bun.mkdirSync(path, { recursive: true });
    } else {
      require("fs").mkdirSync(path, { recursive: true });
    }
  }

  removeDeep(path: string): void {
    if (typeof Bun !== "undefined" && Bun.rmdirSync) {
      Bun.rmdirSync(path, { recursive: true });
    } else {
      require("fs").rmdirSync(path, { recursive: true });
    }
  }
}
