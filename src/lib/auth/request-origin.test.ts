import { describe, expect, it } from "vitest";
import { hasSameOrigin } from "./request-origin";

function request(url: string, origin: string | null) {
  const headers = new Headers();
  if (origin !== null) headers.set("origin", origin);
  return new Request(url, { headers });
}

describe("hasSameOrigin", () => {
  it("accepts an exact matching origin", () => {
    expect(hasSameOrigin(request("https://inglorious.example/api/admin/login", "https://inglorious.example"))).toBe(true);
  });

  it("rejects a different origin and a missing origin", () => {
    expect(hasSameOrigin(request("https://inglorious.example/api/admin/login", "https://attacker.example"))).toBe(false);
    expect(hasSameOrigin(request("https://inglorious.example/api/admin/login", null))).toBe(false);
  });

  it("rejects malformed origin values without throwing", () => {
    expect(hasSameOrigin(request("https://inglorious.example/api/admin/login", "not a url"))).toBe(false);
  });

  it("rejects a lookalike hostname", () => {
    expect(hasSameOrigin(request("https://inglorious.example/api/admin/login", "https://inglorious.example.attacker.example"))).toBe(false);
  });
});
