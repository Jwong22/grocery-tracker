import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

type DetailsResponse = {
  id?: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  location?: { latitude?: number; longitude?: number };
};

export async function POST(req: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: { placeId?: string; sessionToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const placeId = body.placeId;
  if (!placeId) {
    return NextResponse.json({ error: "placeId required" }, { status: 400 });
  }

  const url = new URL(
    `https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`,
  );
  if (body.sessionToken) {
    url.searchParams.set("sessionToken", body.sessionToken);
  }

  const upstream = await fetch(url.toString(), {
    headers: {
      "X-Goog-Api-Key": key,
      "X-Goog-FieldMask": "id,displayName,formattedAddress,location",
    },
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: `Google Places error ${upstream.status}: ${text.slice(0, 200)}` },
      { status: upstream.status },
    );
  }

  const data = (await upstream.json()) as DetailsResponse;
  const lat = data.location?.latitude;
  const lng = data.location?.longitude;
  if (typeof lat !== "number" || typeof lng !== "number") {
    return NextResponse.json(
      { error: "Place has no coordinates" },
      { status: 422 },
    );
  }

  return NextResponse.json({
    placeId: data.id ?? placeId,
    displayName: data.displayName?.text ?? "",
    formattedAddress: data.formattedAddress ?? "",
    lat,
    lng,
  });
}
