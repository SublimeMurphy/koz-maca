import { NextResponse, type NextRequest } from "next/server";
import { withValidManifest } from "@coinbase/onchainkit/minikit";

export const revalidate = 3600;

export function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const manifest = withValidManifest({
    accountAssociation: {
      
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
