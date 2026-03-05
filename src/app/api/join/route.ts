import { NextResponse } from "next/server";
import { getParticipant, setParticipant } from "@/lib/redis";

export async function POST(request: Request) {
  const { nick } = await request.json();

  if (!nick || typeof nick !== "string" || nick.trim().length === 0) {
    return NextResponse.json({ error: "Nick is required" }, { status: 400 });
  }

  const trimmed = nick.trim().substring(0, 30);
  const existing = await getParticipant(trimmed);

  if (!existing) {
    await setParticipant(trimmed, {
      status: "waiting",
      answers: [],
      currentQuestion: 0,
      finishedAt: null,
      chatHistory: [],
    });
  }

  return NextResponse.json({ ok: true, nick: trimmed });
}
