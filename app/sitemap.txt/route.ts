const baseUrl = "https://brandmymac.xyz";

export function GET() {
  return new Response(
    [`${baseUrl}/`, `${baseUrl}/terms`, `${baseUrl}/privacy`, ""].join("\n"),
    {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "public, max-age=3600",
      },
    },
  );
}
