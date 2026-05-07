import { ImageResponse } from "next/og";

export const size = { width: 256, height: 256 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 180,
          background: "#16a34a",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "white",
          borderRadius: 48,
        }}
      >
        🛒
      </div>
    ),
    { ...size },
  );
}
