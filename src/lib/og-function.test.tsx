import { describe, expect, it } from "vitest";
import { GET } from "../../api/og.js";
import { OG_IMAGE_HEIGHT, OG_IMAGE_WIDTH } from "./og.js";

function pngDimensions(bytes: Uint8Array): { width: number; height: number } {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

describe("Open Graph image function", () => {
  it("renders a cacheable PNG for a canonical DID", async () => {
    const response = await GET(
      new Request(
        "https://hasharium.croft.click/api/og?did=did%3Aweb%3Ahasharium.croft.click",
      ),
    );
    const bytes = new Uint8Array(await response.arrayBuffer());

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("cache-control")).toContain("immutable");
    expect(response.headers.get("content-disposition")).toMatch(
      /^inline; filename="hasharium-h-[a-f0-9-]+\.png"$/,
    );
    expect(Array.from(bytes.slice(0, 8))).toEqual([
      137, 80, 78, 71, 13, 10, 26, 10,
    ]);
    expect(pngDimensions(bytes)).toEqual({
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
    });
  });

  it("returns a non-cacheable JSON error for non-DID input", async () => {
    const response = await GET(
      new Request("https://hasharium.croft.click/api/og?did=ewancroft.uk"),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(response.headers.get("cache-control")).toBe("no-store");
    await expect(response.json()).resolves.toEqual({
      error: "InvalidDid",
      message: "The did parameter must be a complete DID.",
    });
  });

  it("renders distinct pixels for distinct canonical DIDs", async () => {
    const [first, second] = await Promise.all([
      GET(
        new Request(
          "https://hasharium.croft.click/api/og?did=did%3Aplc%3Aofrbh253gwicbkc5nktqepol",
        ),
      ),
      GET(
        new Request(
          "https://hasharium.croft.click/api/og?did=did%3Akey%3Az6MkjchhfUsD6F6Qt4",
        ),
      ),
    ]);
    const [firstDigest, secondDigest] = await Promise.all(
      [first, second].map(async (response) => {
        expect(response.status).toBe(200);
        const digest = await crypto.subtle.digest(
          "SHA-256",
          await response.arrayBuffer(),
        );
        return Buffer.from(digest).toString("hex");
      }),
    );

    expect(secondDigest).not.toBe(firstDigest);
  });
});
