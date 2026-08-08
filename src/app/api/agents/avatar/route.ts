import { NextResponse, type NextRequest } from "next/server";
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { getSessionUserId } from "@/lib/auth";
import { avatarPathPrefix } from "@/lib/agent-validate";

export const runtime = "nodejs";

const ALLOWED_CONTENT_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_AVATAR_BYTES = 1_000_000;

// The client picks the blob pathname, so this is the only thing standing
// between a user and someone else's avatar folder.
class AvatarPathError extends Error {}

function assertOwnAvatarPath(pathname: string, userId: string): void {
  const prefix = avatarPathPrefix(userId);
  const rejected =
    !pathname.startsWith(prefix) ||
    // One segment below the prefix, no traversal, no absolute path.
    pathname.slice(prefix.length).includes("/") ||
    pathname.includes("..") ||
    pathname.length === prefix.length;
  if (rejected) {
    throw new AvatarPathError(`Avatar path must be a single file under ${prefix}`);
  }
}

// Client-upload token endpoint for buddy avatars (see @vercel/blob/client
// `upload()`). The browser never sees BLOB_READ_WRITE_TOKEN: it asks here for a
// short-lived token scoped to one pathname, content type and size.
export async function POST(req: NextRequest) {
  let body: HandleUploadBody;
  try {
    body = (await req.json()) as HandleUploadBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Only the token request comes from the browser. The upload-completed
  // callback is delivered by Vercel with no session cookie and is
  // signature-verified inside handleUpload instead.
  const userId = await getSessionUserId();
  if (!userId && body.type === "blob.generate-client-token") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const result = await handleUpload({
      body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!userId) throw new AvatarPathError("Unauthorized");
        assertOwnAvatarPath(pathname, userId);
        return {
          allowedContentTypes: ALLOWED_CONTENT_TYPES,
          maximumSizeInBytes: MAX_AVATAR_BYTES,
          // Two uploads from the same user can share a filename without one
          // overwriting the other.
          addRandomSuffix: true,
        };
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof AvatarPathError) {
      return NextResponse.json({ error: err.message }, { status: 403 });
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Avatar upload failed" },
      { status: 400 }
    );
  }
}
