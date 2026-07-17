import { afterEach, describe, expect, it, vi } from "vitest";
import { GET } from "../../api/collectors";

afterEach(() => vi.unstubAllGlobals());

describe("collector API function", () => {
  it("rejects non-DID subjects without consulting the index", async () => {
    const fetcher = vi.fn();
    vi.stubGlobal("fetch", fetcher);
    const response = await GET({
      url: "/api/collectors?did=ewancroft.uk",
    } as Request);
    expect(response.status).toBe(400);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("returns an edge-cacheable empty verified register", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () =>
        Response.json({ records: [], cursor: null }, { status: 200 }),
      ),
    );
    const response = await GET(
      new Request(
        "https://hasharium.croft.click/api/collectors?did=did%3Aplc%3Aofrbh253gwicbkc5nktqepol",
      ),
    );
    expect(response.status).toBe(200);
    expect(response.headers.get("cache-control")).toContain("s-maxage=300");
    await expect(response.json()).resolves.toMatchObject({
      count: 0,
      collectors: [],
    });
  });
});
