// @vitest-environment node

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const styles = readFileSync(new URL("./index.css", import.meta.url), "utf8");
const document = readFileSync(new URL("../index.html", import.meta.url), "utf8");

describe("Mist theme", () => {
  it("uses the calm blue accent", () => {
    expect(styles).toContain("--sidebar-primary: #5f93b8;");
    expect(styles).toContain("--sidebar-primary-foreground: #0a0a0a;");
    expect(styles).toContain("--sidebar-ring: #5f93b8;");
  });

  it("preloads the groovepaper texture before React renders", () => {
    expect(document).toContain(
      '<link rel="preload" as="image" href="/textures/groovepaper.png" />',
    );
  });

  it("defines the work title slow-spin gradient", () => {
    expect(styles).toContain("@property --work-gradient-angle");
    expect(styles).toContain("animation: work-gradient-spin 8s linear infinite");
    expect(styles).toContain("prefers-reduced-motion: reduce");
  });
});
