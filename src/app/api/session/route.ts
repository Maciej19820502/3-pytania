import { NextResponse } from "next/server";
import {
  getSessionConfig,
  saveSessionConfig,
  getSessionStatus,
  setSessionStatus,
  getAllParticipants,
  getGroupSummary,
  clearSession,
  SessionConfig,
} from "@/lib/redis";

export async function GET() {
  const [config, status, participants, summary] = await Promise.all([
    getSessionConfig(),
    getSessionStatus(),
    getAllParticipants(),
    getGroupSummary(),
  ]);

  const participantList = Object.entries(participants).map(([nick, data]) => ({
    nick,
    status: data.status,
    currentQuestion: data.currentQuestion,
    answersCount: data.answers.length,
  }));

  return NextResponse.json({
    config,
    status,
    participants: participantList,
    participantCount: participantList.length,
    summary,
  });
}

export async function POST(request: Request) {
  const body = await request.json();
  const { action } = body;

  if (action === "start") {
    await clearSession();
    const config: SessionConfig = {
      context: body.context,
      questions: body.questions,
      duration: body.duration,
      startedAt: Date.now(),
      language: body.language || "pl",
    };
    await saveSessionConfig(config);
    await setSessionStatus("active");
    return NextResponse.json({ ok: true });
  }

  if (action === "finish") {
    await setSessionStatus("finished");
    return NextResponse.json({ ok: true });
  }

  if (action === "reset") {
    await clearSession();
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
