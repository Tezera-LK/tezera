//Health check

export const dynamic = "force-dynamic";

export function GET() {
    return Response.json(
        { 
            status: "ok",
            branch: process.env.BUILD_BRANCH,
            commit: process.env.BUILD_COMMIT,
            time: new Date().toISOString(),
        },
        { headers: { "Cache-Control": "no-store" } },
    );
}