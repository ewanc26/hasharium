import { ImageResponse } from "@vercel/og";
import {
  compactOgDid,
  OG_IMAGE_HEIGHT,
  OG_IMAGE_WIDTH,
  OgInputError,
  parseOgDid,
} from "../src/lib/og.js";
import { GENERATOR_VERSION } from "../src/lib/protocol.js";
import { generateSpecimen, type Specimen } from "../src/lib/shape.js";

const PAPER = "#ebe7dc";
const PAPER_LIGHT = "#f5f1e8";
const INK = "#172923";
const MUTED = "#68736e";
const LINE = "#c9c5ba";
const OXIDE = "#b94d32";

function SpecimenPlate({ specimen }: { specimen: Specimen }) {
  const gradientId = `og-${specimen.fingerprint.slice(0, 10)}`;

  return (
    <div
      style={{
        display: "flex",
        width: 462,
        height: 462,
        position: "relative",
        alignItems: "center",
        justifyContent: "center",
        background: PAPER_LIGHT,
        border: `1px solid ${LINE}`,
        boxShadow: "8px 8px 0 #d8d3c7",
      }}
    >
      <svg
        width="420"
        height="420"
        viewBox="0 0 320 320"
        role="img"
        aria-label={`${specimen.name}, a deterministic specimen for ${specimen.did}`}
      >
        <defs>
          <radialGradient id={gradientId} cx="36%" cy="30%" r="76%">
            <stop offset="0%" stopColor={specimen.palette[1]} />
            <stop offset="58%" stopColor={specimen.palette[0]} />
            <stop offset="100%" stopColor={specimen.palette[2]} />
          </radialGradient>
        </defs>
        <circle
          cx="160"
          cy="160"
          r="145"
          fill="none"
          stroke={LINE}
          strokeWidth="0.8"
        />
        <circle
          cx="160"
          cy="160"
          r="128"
          fill="none"
          stroke={LINE}
          strokeWidth="0.5"
        />
        <g transform={`rotate(${specimen.rotation} 160 160)`}>
          {specimen.paths.map((path, index) => (
            <path
              key={path}
              d={path}
              fill={
                index === 0
                  ? `url(#${gradientId})`
                  : specimen.palette[(index + 1) % 3]
              }
              fillOpacity={index === 0 ? 0.96 : 0.72 + index * 0.06}
              stroke={
                index === specimen.paths.length - 1
                  ? PAPER_LIGHT
                  : specimen.palette[2]
              }
              strokeOpacity={index === specimen.paths.length - 1 ? 0.82 : 0.38}
              strokeWidth="1.2"
            />
          ))}
          <circle
            cx="160"
            cy="160"
            r={specimen.aperture}
            fill={INK}
            stroke={specimen.palette[1]}
            strokeWidth="2"
          />
          <circle
            cx="160"
            cy="160"
            r={Math.max(2, specimen.aperture * 0.26)}
            fill={PAPER_LIGHT}
          />
        </g>
      </svg>
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 18,
          left: 20,
          color: MUTED,
          fontSize: 13,
          letterSpacing: "0.16em",
        }}
      >
        PLATE / {specimen.catalogueNumber}
      </div>
      <div
        style={{
          display: "flex",
          position: "absolute",
          right: 18,
          bottom: 16,
          color: OXIDE,
          fontSize: 13,
          letterSpacing: "0.14em",
        }}
      >
        {specimen.symmetry}-FOLD · {specimen.layers} LAYERS
      </div>
    </div>
  );
}

function HashariumCard({ specimen }: { specimen: Specimen }) {
  return (
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        position: "relative",
        overflow: "hidden",
        color: INK,
        background: PAPER,
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          width: 18,
          background: OXIDE,
        }}
      />
      <div
        style={{
          display: "flex",
          width: 650,
          padding: "54px 46px 42px 58px",
          flexDirection: "column",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              color: OXIDE,
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "0.18em",
            }}
          >
            <span
              style={{
                display: "flex",
                width: 30,
                height: 2,
                marginRight: 13,
                background: OXIDE,
              }}
            />
            REGISTRY OF DETERMINISTIC FORMS
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 30,
              flexDirection: "column",
              fontSize: 74,
              fontWeight: 500,
              letterSpacing: "-0.055em",
              lineHeight: 0.9,
            }}
          >
            <span>{specimen.name.split(" ")[0]}</span>
            <span style={{ color: OXIDE }}>
              {specimen.name.split(" ").slice(1).join(" ")}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 29,
              maxWidth: 550,
              color: MUTED,
              fontSize: 20,
              lineHeight: 1.45,
            }}
          >
            One decentralised identity, interpreted as a stable form.
            Calculated—not minted or assigned.
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              padding: "15px 0",
              borderTop: `1px solid ${LINE}`,
              borderBottom: `1px solid ${LINE}`,
              flexDirection: "column",
            }}
          >
            <span
              style={{
                display: "flex",
                color: OXIDE,
                fontSize: 12,
                letterSpacing: "0.17em",
              }}
            >
              SUBJECT / DID
            </span>
            <span
              style={{
                display: "flex",
                marginTop: 7,
                fontSize: 17,
                letterSpacing: "0.015em",
              }}
            >
              {compactOgDid(specimen.did)}
            </span>
          </div>
          <div
            style={{
              display: "flex",
              marginTop: 17,
              justifyContent: "space-between",
              color: MUTED,
              fontSize: 13,
              letterSpacing: "0.12em",
            }}
          >
            <span>HASHARIUM.CROFT.CLICK</span>
            <span>{GENERATOR_VERSION.toUpperCase()}</span>
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          background: "#e3ded2",
          borderLeft: `1px solid ${LINE}`,
        }}
      >
        <SpecimenPlate specimen={specimen} />
      </div>
    </div>
  );
}

export async function GET(request: Request): Promise<Response> {
  try {
    const url = new URL(request.url);
    const did = parseOgDid(url.searchParams.get("did"));
    const specimen = await generateSpecimen(did);

    return new ImageResponse(<HashariumCard specimen={specimen} />, {
      width: OG_IMAGE_WIDTH,
      height: OG_IMAGE_HEIGHT,
      headers: {
        "Cache-Control": "public, immutable, no-transform, max-age=31536000",
        "Content-Disposition": `inline; filename="hasharium-${specimen.catalogueNumber.toLowerCase()}.png"`,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (reason) {
    if (reason instanceof OgInputError) {
      return Response.json(
        { error: "InvalidDid", message: reason.message },
        { status: 400, headers: { "Cache-Control": "no-store" } },
      );
    }
    return Response.json(
      {
        error: "ImageGenerationFailed",
        message: "The specimen image could not be generated.",
      },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
