import { describe, it, expect } from "vitest";
import { MAX_UPLOAD_BYTES, ALLOWED_EXTENSIONS } from "./g3";

describe("sanity — vitest environment", () => {
  it("should run a basic assertion", () => {
    expect(1 + 1).toBe(2);
  });

  it("should resolve project imports from g3.ts", () => {
    expect(MAX_UPLOAD_BYTES).toBe(20 * 1024 * 1024);
    expect(ALLOWED_EXTENSIONS).toContain("pdf");
  });
});
