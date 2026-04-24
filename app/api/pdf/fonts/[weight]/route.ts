import { readFile } from "node:fs/promises";

const FONT_COLLECTION_PATH = "/Library/Fonts/SourceHanCodeJP.ttc";

type RouteContext = {
  params: Promise<{
    weight: string;
  }>;
};

const fontPaths = {
  "400": FONT_COLLECTION_PATH,
  "700": FONT_COLLECTION_PATH,
} as const;

export const runtime = "nodejs";

export async function GET(_request: Request, context: RouteContext) {
  const { weight } = await context.params;
  const fontPath = fontPaths[weight as keyof typeof fontPaths];

  if (!fontPath) {
    return new Response("Not Found", { status: 404 });
  }

  try {
    const fontBytes = await readFile(fontPath);

    return new Response(new Uint8Array(fontBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return new Response("Not Found", { status: 404 });
  }
}