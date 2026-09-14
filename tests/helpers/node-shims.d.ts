declare module "node:fs/promises" {
  export function mkdtemp(prefix: string): Promise<string>;
  export function rm(
    path: string,
    options: { recursive: boolean; force: boolean },
  ): Promise<void>;
  export function writeFile(
    path: string,
    data: string,
    encoding: "utf8",
  ): Promise<void>;
}

declare module "node:fs" {
  export function existsSync(path: string): boolean;
  export function mkdtempSync(prefix: string): string;
  export function readFileSync(path: string, encoding: "utf8"): string;
  export function rmSync(
    path: string,
    options: { recursive: boolean; force: boolean },
  ): void;
  export function writeFileSync(
    path: string,
    data: string,
    encoding: "utf8",
  ): void;
}

declare module "node:child_process" {
  export function spawnSync(
    command: string,
    args: string[],
    options: { encoding: "utf8"; cwd?: string },
  ): {
    status: number | null;
    stdout: string;
    stderr: string;
    error?: Error;
  };
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:path" {
  export function join(...paths: string[]): string;
}

declare module "node:url" {
  export function pathToFileURL(path: string): { href: string };
}

declare const process: {
  cwd(): string;
  execPath: string;
};
