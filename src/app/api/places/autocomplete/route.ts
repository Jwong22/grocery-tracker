import { NextResponse, type NextRequest } from "next/server";

export const runtime = "nodejs";

type Suggestion = {
  placePrediction?: {
    placeId: string;
    text?: { text: string };
    structuredFormat?: {
      mainText?: { text: string };
      secondaryText?: { text: string };
    };
  };
};

type AutocompleteResponse = {
  suggestions?: Suggestion[];
};

export async function POST(req: NextRequest) {
  const key = process.env.GOOGLE_MAPS_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "GOOGLE_MAPS_API_KEY is not configured on the server." },
      { status: 500 },
    );
  }

  let body: { input?: string; sessionToken?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const input = (body.input ?? "").trim();
  const sessionToken = body.sessionToken;
  if (input.length < 1) {
    return NextResponse.json({ predictions: [] });
  }

  const upstream = await fetch(
    "https://places.googleapis.com/v1/places:autocomplete",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": key,
      },
      body: JSON.stringify({
        input,
        sessionToken,
        languageCode: "en",
        includedRegionCodes: ["my"],
      }),
    },
  );

  if (!upstream.ok) {
    const text = await upstream.text();
    return NextResponse.json(
      { error: `Google Places error ${upstream.status}: ${text.slice(0, 200)}` },
      { status: upstream.status },
    );
  }

  const data = (await upstream.json()) as AutocompleteResponse;
  const predictions = (data.suggestions ?? [])
    .filter(
      (s): s is Required<Pick<Suggestion, "placePrediction">> =>
        s.placePrediction != null && Boolean(s.placePrediction.placeId),
    )
    .map((s) => ({
      placeId: s.placePrediction.placeId,
      mainText:
        s.placePrediction.structuredFormat?.mainText?.text ??
        s.placePrediction.text?.text ??
        "",
      secondaryText:
        s.placePrediction.structuredFormat?.secondaryText?.text ?? "",
      fullText: s.placePrediction.text?.text ?? "",
    }));

  return NextResponse.json({ predictions });
}
