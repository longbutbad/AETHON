import { NextResponse } from "next/server";

/**
 * Fetch a YouTube video's title + thumbnail via the public oEmbed endpoint
 * (no API key). Done server-side to avoid CORS.
 * GET /api/yt?id=<videoId>
 */
export async function GET(request: Request) {
  const id = new URL(request.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing id" }, { status: 400 });

  try {
    const res = await fetch(
      `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${id}&format=json`,
      { cache: "no-store" },
    );
    if (!res.ok) return NextResponse.json({ title: null, thumbnail: null });
    const data = await res.json();
    return NextResponse.json({
      title: data.title ?? null,
      thumbnail: data.thumbnail_url ?? `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    });
  } catch {
    return NextResponse.json({ title: null, thumbnail: null });
  }
}
