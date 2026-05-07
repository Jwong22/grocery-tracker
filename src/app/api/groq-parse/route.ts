import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

const ENDPOINT = "https://api.groq.com/openai/v1/chat/completions";
// Swap if Groq retires this model — see https://console.groq.com/docs/models
const MODEL = "meta-llama/llama-4-scout-17b-16e-instruct";

const PROMPT = `You extract grocery pricing data from an image. The image is ONE of:
A) A till / checkout receipt (multiple line items with prices and a total).
B) A shelf-edge price tag or sticker (one product, price shown per piece or per kg).
C) A weighed-produce sticker (one item with a printed weight and total price).

Return STRICT JSON — an object with an "items" array:
{
  "items": [
    {
      "productName": "broccoli",
      "brand": null,
      "originCountry": "China",
      "packType": "loose",
      "packSizeG": null,
      "priceMyr": 2.69
    }
  ]
}

Rules:
- packType ∈ {loose, packet, bottle, can, bag, box, tray, bunch}. Default "loose".
- packSizeG is grams. kg→1000, ml→approx grams. null if unknown or sold per piece.
- priceMyr is a NUMBER in Malaysian Ringgit (not a string).
- Receipts: emit every grocery line item; skip subtotals, taxes, rounding, payments.
- Shelf-edge tags: emit ONE item.
  • "/PC", "/PCS", "/EACH" → per-piece price, packSizeG = null.
  • "/KG" → set packSizeG = 1000 so priceMyr represents 1 kg.
  • Pull country from a "Country:" line into originCountry. Ignore "Grade", "Size", barcodes.
- Weighed-produce stickers: emit ONE item, priceMyr = total price shown, packSizeG = printed weight in grams.
- If the image is unreadable or contains no price, return {"items": []}.
- Output ONLY the JSON object. No prose, no markdown fences.`;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: settings } = await supabase
    .from("user_settings")
    .select("groq_api_key")
    .eq("user_id", user.id)
    .maybeSingle();

  const userKey =
    typeof settings?.groq_api_key === "string"
      ? settings.groq_api_key.trim()
      : "";
  const envKey =
    process.env.GROQ_API_KEY?.trim() ||
    process.env.GROQL_API_KEY?.trim() ||
    "";
  const key = userKey || envKey;
  if (!key) {
    return NextResponse.json(
      {
        error:
          "No Groq key available. Add one in Settings, or set GROQ_API_KEY on the server.",
      },
      { status: 400 },
    );
  }

  const incoming = await request.formData();
  const file = incoming.get("document");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "No document uploaded" },
      { status: 400 },
    );
  }

  const ab = await file.arrayBuffer();
  const b64 = Buffer.from(ab).toString("base64");
  const mime = file.type || "image/jpeg";

  const body = {
    model: MODEL,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: PROMPT },
          {
            type: "image_url",
            image_url: { url: `data:${mime};base64,${b64}` },
          },
        ],
      },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  };

  const res = await fetch(ENDPOINT, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const text = await res.text();
  if (!res.ok) {
    return NextResponse.json(
      { error: `Groq ${res.status}: ${text.slice(0, 300)}` },
      { status: 502 },
    );
  }
  return new NextResponse(text, {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
