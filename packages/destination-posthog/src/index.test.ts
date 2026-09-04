import { describe, expect, it } from "vitest";
import { createPostHogServer, createPostHogWeb } from "./index.js";

describe("index barrel", () => {
  it("exports both factories", () => {
    expect(typeof createPostHogWeb).toBe("function");
    expect(typeof createPostHogServer).toBe("function");
    expect(createPostHogWeb({ apiKey: "k" }).runtime).toBe("client");
    expect(createPostHogServer({ apiKey: "k" }).runtime).toBe("server");
  });
});
