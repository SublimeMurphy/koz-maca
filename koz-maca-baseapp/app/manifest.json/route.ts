import { NextResponse, type NextRequest } from "next/server";
import { withValidManifest } from "@coinbase/onchainkit/minikit";

export const revalidate = 3600;

export function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const manifest = withValidManifest({
    baseBuilder: {
      ownerAddress: "0xACAFA638CB6736f54e9616F72DF895B0199b8Ba8",
    },
  });

  return NextResponse.json(manifest);
}
