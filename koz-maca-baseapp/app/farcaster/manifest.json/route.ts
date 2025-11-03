import { NextResponse, type NextRequest } from "next/server";
import { withValidManifest } from "@coinbase/onchainkit/minikit";

export const revalidate = 3600;

export function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const manifest = withValidManifest({
    accountAssociation: {
      header:
        "eyJmaWQiOjE0Mjg1MTQsInR5cGUiOiJjdXN0b2R5Iiwia2V5IjoiMHhjM2EwNzg1MDU1Q2VEMzRFYjI0MmJhYjQ3RGVGOTYyQmFjYzlENjkyIn0",
      payload: "eyJkb21haW4iOiJrb3otbWFjYS52ZXJjZWwuYXBwIn0",
      signature:
        "Nrhvm1yetqz5GC32uU9nRnbxivWpFIY20NJbp4sSS9IzNEqkpwI37dOcjc+5lIipjNYR1nK69Xja/yvPpOS+kxw=",
    },
    miniapp: {
        version: "1",
        name: "Koz Maca",
        description: "Koz Maca",
        iconUrl: `${origin}/icon.png`,
        homeUrl: origin,
        splashImageUrl: `${origin}/sphere.svg`,
        splashBackgroundColor: "#0f172a",
        termsUrl: origin,
        supportUrl: origin,
        categories: ["education", "games"],
        primaryCategory: "games",
        tags: ["batak", "game", "education"],
      },
    baseBuilder: {
      ownerAddress: "0xACAFA638CB6736f54e9616F72DF895B0199b8Ba8",
    },
  });

  return NextResponse.json(manifest);
}
