"use client";

import { useState, useEffect, useCallback } from "react";
import { translations, Language } from "@/lib/translations";

interface Participant {
  nick: string;
  status: string;
  currentQuestion: number;
  answersCount: number;
}

export default function AdminPage() {
  const [lang, setLang] = useState<Language>("pl");
  const t = translations[lang];

  const [context, setContext] = useState(t.defaultContext);
  const [questions, setQuestions] = useState<string[]>([...t.defaultQuestions]);
  const [duration, setDuration] = useState(5);
  const [sessionStatus, setSessionStatus] = useState("waiting");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [participantCount, setParticipantCount] = useState(0);
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [configDuration, setConfigDuration] = useState(5);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [loading, setLoading] = useState(false);

  const switchLanguage = (newLang: Language) => {
    const oldT = translations[lang];
    const newT = translations[newLang];
    // Switch defaults if current values match old defaults
    if (context === oldT.defaultContext) {
      setContext(newT.defaultContext);
    }
    const oldDefaults = oldT.defaultQuestions;
    const newDefaults = newT.defaultQuestions;
    setQuestions((prev) =>
      prev.map((q, i) => (q === oldDefaults[i] ? newDefaults[i] : q))
    );
    setLang(newLang);
  };

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/session");
      const data = await res.json();
      setSessionStatus(data.status);
      setParticipants(data.participants);
      setParticipantCount(data.participantCount);
      if (data.config?.startedAt) setStartedAt(data.config.startedAt);
      if (data.config?.duration) setConfigDuration(data.config.duration);
      if (data.config?.language) setLang(data.config.language);
      if (data.summary) setSummary(data.summary);
    } catch (e) {
      console.error("Poll error:", e);
    }
  }, []);

  useEffect(() => {
    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [poll]);

  useEffect(() => {
    if (!startedAt || sessionStatus !== "active") {
      setTimeLeft(null);
      return;
    }
    const tick = () => {
      const elapsed = Date.now() - startedAt;
      const remaining = configDuration * 60 * 1000 - elapsed;
      setTimeLeft(Math.max(0, remaining));
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [startedAt, configDuration, sessionStatus]);

  const handleStart = async () => {
    setLoading(true);
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "start",
        context,
        questions,
        duration,
        language: lang,
      }),
    });
    setLoading(false);
    poll();
  };

  const handleFinish = async () => {
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "finish" }),
    });
    poll();
  };

  const handleGenerateSummary = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/summary", { method: "POST" });
      const data = await res.json();
      if (data.summary) setSummary(data.summary);
    } catch (e) {
      console.error("Summary error:", e);
    }
    setGenerating(false);
  };

  const handleReset = async () => {
    if (!confirm(t.resetConfirm)) return;
    await fetch("/api/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "reset" }),
    });
    setSummary(null);
    setStartedAt(null);
    poll();
  };

  const formatTime = (ms: number) => {
    const totalSec = Math.floor(ms / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    return `${min}:${sec.toString().padStart(2, "0")}`;
  };

  // BEFORE START
  if (sessionStatus === "waiting") {
    return (
      <div className="space-y-6 fade-in">
        {/* Language toggle */}
        <section className="card card-hover p-6">
          <div className="flex items-center justify-between">
            <p className="section-title">
              {lang === "pl" ? "Jezyk sesji" : "Session language"}
            </p>
            <div className="flex rounded-lg overflow-hidden border border-white/10">
              <button
                onClick={() => switchLanguage("pl")}
                className={`px-4 py-2 text-sm font-bold transition-all ${
                  lang === "pl"
                    ? "bg-[#F0A500] text-[#1E3A5F]"
                    : "bg-transparent text-white/50 hover:text-white"
                }`}
              >
                PL
              </button>
              <button
                onClick={() => switchLanguage("en")}
                className={`px-4 py-2 text-sm font-bold transition-all ${
                  lang === "en"
                    ? "bg-[#F0A500] text-[#1E3A5F]"
                    : "bg-transparent text-white/50 hover:text-white"
                }`}
              >
                EN
              </button>
            </div>
          </div>
        </section>

        {/* Context */}
        <section className="card card-hover p-6">
          <p className="section-title mb-4">{t.sessionContext}</p>
          <label className="block text-xs text-white/40 mb-2 font-medium">
            {t.participantContext}
          </label>
          <textarea
            className="input-field w-full p-3 text-sm resize-none"
            rows={3}
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </section>

        {/* Questions */}
        <section className="card card-hover p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="section-title">{t.questions}</p>
            <button
              onClick={() => {
                setQuestions([...t.defaultQuestions]);
                setContext(t.defaultContext);
              }}
              className="btn-ghost text-xs px-3 py-1.5"
            >
              {t.restoreDefaults}
            </button>
          </div>
          {questions.map((q, i) => (
            <div key={i} className="mb-3">
              <label className="block text-xs text-white/40 mb-2 font-medium">
                {t.question} {i + 1}
              </label>
              <textarea
                className="input-field w-full p-3 text-sm resize-none"
                rows={2}
                value={q}
                onChange={(e) => {
                  const next = [...questions];
                  next[i] = e.target.value;
                  setQuestions(next);
                }}
              />
            </div>
          ))}
        </section>

        {/* Settings */}
        <section className="card card-hover p-6">
          <p className="section-title mb-4">{t.sessionSettings}</p>
          <label className="block text-xs text-white/40 mb-2 font-medium">
            {t.responseTime}
          </label>
          <input
            type="number"
            min={1}
            max={15}
            value={duration}
            onChange={(e) =>
              setDuration(Math.min(15, Math.max(1, Number(e.target.value))))
            }
            className="input-field w-24 p-2.5 text-center text-sm"
          />
        </section>

        {/* Connection status */}
        <section className="card card-hover p-6">
          <p className="section-title mb-3">{t.connectionStatus}</p>
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 pulse-glow" />
            <p className="text-lg font-medium">
              <span className="text-[#F0A500] font-bold text-2xl">
                {participantCount}
              </span>
              <span className="text-white/50 ml-2 text-sm">
                {participantCount === 1
                  ? t.participantConnected
                  : t.participantsConnected}
              </span>
            </p>
          </div>
        </section>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="btn-primary w-full py-4 text-lg tracking-wide"
        >
          {loading ? t.starting : t.startSession}
        </button>
      </div>
    );
  }

  // ACTIVE or FINISHED
  return (
    <div className="space-y-6 fade-in">
      {/* Timer */}
      {sessionStatus === "active" && timeLeft !== null && (
        <div className="text-center py-2">
          <div
            className={`text-5xl font-bold font-mono tabular-nums ${
              timeLeft < 60000
                ? "text-red-400 timer-danger"
                : "text-[#F0A500] timer-glow"
            }`}
          >
            {formatTime(timeLeft)}
          </div>
          <p className="text-white/30 text-xs mt-2 font-medium uppercase tracking-wider">
            {t.timeRemaining}
          </p>
        </div>
      )}

      {sessionStatus === "active" && timeLeft === 0 && (
        <div className="text-center py-4">
          <p className="text-red-400 text-2xl font-bold">{t.timeUp}</p>
        </div>
      )}

      {/* Participants */}
      <section className="card p-6">
        <p className="section-title mb-4">
          {t.participants} ({participants.length})
        </p>
        {participants.length === 0 ? (
          <p className="text-white/30 text-sm">{t.noParticipants}</p>
        ) : (
          <ul className="space-y-2.5">
            {participants.map((p) => (
              <li
                key={p.nick}
                className="flex items-center gap-3 py-2 px-3 rounded-lg bg-white/[0.02]"
              >
                {p.status === "finished" ? (
                  <div className="w-7 h-7 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-400 text-xs">&#10003;</span>
                  </div>
                ) : (
                  <div className="w-7 h-7 rounded-full bg-[#F0A500]/10 flex items-center justify-center flex-shrink-0">
                    <div className="w-2 h-2 rounded-full bg-[#F0A500] pulse-glow" />
                  </div>
                )}
                <span className="font-medium text-sm">{p.nick}</span>
                <span className="text-white/30 text-xs ml-auto">
                  {p.status === "finished"
                    ? t.completed
                    : p.status === "in_progress"
                    ? `${t.questionProgress} ${p.currentQuestion + 1}/3`
                    : t.waiting}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Actions */}
      {sessionStatus === "active" && (
        <button
          onClick={handleFinish}
          className="btn-danger w-full py-3 text-sm"
        >
          {t.endEarly}
        </button>
      )}

      {(sessionStatus === "finished" ||
        (sessionStatus === "active" && timeLeft === 0)) &&
        !summary && (
          <button
            onClick={handleGenerateSummary}
            disabled={generating}
            className="btn-primary w-full py-3 text-sm"
          >
            {generating ? t.generatingSummary : t.generateResults}
          </button>
        )}

      {/* Summary */}
      {summary && (
        <section className="card p-6 fade-in">
          <p className="section-title mb-4">{t.groupResults}</p>
          <div className="text-white/80 whitespace-pre-wrap leading-relaxed text-sm">
            {summary}
          </div>
        </section>
      )}

      {/* Reset */}
      <button
        onClick={handleReset}
        className="btn-ghost w-full py-2.5 text-xs"
      >
        {t.resetSession}
      </button>
    </div>
  );
}
