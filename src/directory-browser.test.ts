// @vitest-environment node

import { mkdtemp, mkdir, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { listDirectories } from "../directory-browser.js";

describe("listDirectories", () => {
  it("returns only child directories in natural name order", async () => {
    const root = await mkdtemp(join(tmpdir(), "mist-directories-"));
    await mkdir(join(root, "Project 10"));
    await mkdir(join(root, "Project 2"));
    await mkdir(join(root, ".private"));
    await writeFile(join(root, "notes.txt"), "hidden from directory API");

    const result = await listDirectories(root, root);

    expect(result.current).toBe(root);
    expect(result.parent).toBe(root);
    expect(result.directories.map((entry) => entry.name)).toEqual([
      "Project 2",
      "Project 10",
    ]);
    expect(result.directories.every((entry) => entry.path.startsWith(`${root}/`))).toBe(true);
  });

  it("rejects hidden paths inside the browse root", async () => {
    const root = await mkdtemp(join(tmpdir(), "mist-hidden-"));
    const hidden = join(root, ".private");
    await mkdir(hidden);

    await expect(listDirectories(hidden, root)).rejects.toThrow("hidden");
  });

  it("rejects relative paths", async () => {
    await expect(listDirectories("../root")).rejects.toThrow("absolute");
  });
});
