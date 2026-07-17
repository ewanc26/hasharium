import { findCollectors } from "../src/lib/backlinks.js";
import { isDid } from "../src/lib/shape.js";

function json(body: unknown, status: number, cacheControl: string): Response {
  return Response.json(body, {
    status,
    headers: {
      "cache-control": cacheControl,
      "content-type": "application/json; charset=utf-8",
      "x-content-type-options": "nosniff",
    },
  });
}

export async function GET(request: Request): Promise<Response> {
  const subject =
    new URL(request.url, "https://hasharium.croft.click").searchParams
      .get("did")
      ?.trim() ?? "";
  if (!isDid(subject)) {
    return json(
      { error: "The did parameter must be a complete DID." },
      400,
      "no-store",
    );
  }
  try {
    const collectors = await findCollectors(subject);
    return json(
      { subject, collectors, count: collectors.length },
      200,
      "public, s-maxage=300, stale-while-revalidate=1800",
    );
  } catch {
    return json(
      { error: "Collector discovery is temporarily unavailable." },
      502,
      "no-store",
    );
  }
}
