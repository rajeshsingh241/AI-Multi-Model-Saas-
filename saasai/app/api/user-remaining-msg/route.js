import { currentUser } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { aj } from "@/config/Arcjet";

export async function POST(req) {
  const user = await currentUser();
  let body = {};

  try {
    body = await req.json(); // parse body safely
  } catch (err) {
    // No JSON body sent
    body = {};
  }

  const requestedTokens = body.token || 0; // default to 0 if not sent
  const userId = user?.primaryEmailAddress?.emailAddress || user?.id;

  if (!userId) {
    return NextResponse.json({ error: "No user found", remainingToken: 0 }, { status: 400 });
  }

  try {
    const decision = await aj.protect(req, {
      userId,
      requested: requestedTokens,
    });

    if (decision.isDenied()) {
      return NextResponse.json({
        error: "Too many requests",
        remainingToken: decision.reason.remaining,
      });
    }

    return NextResponse.json({
      allowed: true,
      remainingToken: decision.reason.remaining,
    });
  } catch (err) {
    console.error("Arcjet error:", err);
    return NextResponse.json({ error: "Internal server error", remainingToken: 0 }, { status: 500 });
  }
}
