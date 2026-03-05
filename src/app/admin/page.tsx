"use client";

import { useState, useEffect, useCallback } from "react";

const DEFAULT_CONTEXT =
  'Uczestnicy studiow podyplomowych "AI w finansach i controllingu" -- menedzerowie i specjalisci z dzialow finansowych, controllingu i audytu.';

const DEFAULT_QUESTIONS = [
  "Jak czesto uzywasz narzedzi AI w swojej codziennej pracy? (nigdy / sporadycznie / regularnie / codziennie)",
  "Co najbardziej niepokoi Cie w zwiazku z AI w Twojej pracy zawodowej?",
  "Jakie narzedzie AI znasz z nazwy -- chocby jedno?",
];

interface Participant {
  nick: string;
  status: string;
  currentQuestion: number;
  answersCount: number;
}

export default function AdminPage() {
  const [context, setContext] = useState(DEFAULT_CONTEXT);
  const [questions, setQuestions] = useState(DEFAULT_QUESTIONS);
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

  const poll = useCallback(async () => {
    try {
      const res = await fetch("/api/session");
      const data = await res.json();
      setSessionStatus(data.status);
      setParticipants(data.participants);
      setParticipantCount(data.participantCount);
      if (data.config?.startedAt) setStartedAt(data.config.startedAt);
      if (data.config?.duration) setConfigDuration(data.config.duration);
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
    if (!confirm("Na pewno zresetowac sesje? Wszystkie dane zostana utracone."))
      return;
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
      <div className="space-y-8">
        {/* Context */}
        <section className="bg-white/5 rounded-lg p-6">
          <h2 className="text-gold font-bold text-lg mb-3">Kontekst sesji</h2>
          <label className="block text-sm text-white/70 mb-1">
            Kontekst uczestnikow
          </label>
          <textarea
            className="w-full bg-white/10 border border-white/20 rounded p-3 text-white text-sm resize-none focus:outline-none focus:border-gold"
            rows={3}
            value={context}
            onChange={(e) => setContext(e.target.value)}
          />
        </section>

        {/* Questions */}
        <section className="bg-white/5 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-gold font-bold text-lg">Pytania</h2>
            <button
              onClick={() => setQuestions([...DEFAULT_QUESTIONS])}
              className="text-xs text-white/50 hover:text-gold border border-white/20 rounded px-3 py-1"
            >
              Przywroc domyslne
            </button>
          </div>
          {questions.map((q, i) => (
            <div key={i} className="mb-3">
              <label className="block text-sm text-white/70 mb-1">
                Pytanie {i + 1}
              </label>
              <textarea
                className="w-full bg-white/10 border border-white/20 rounded p-3 text-white text-sm resize-none focus:outline-none focus:border-gold"
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
        <section className="bg-white/5 rounded-lg p-6">
          <h2 className="text-gold font-bold text-lg mb-3">
            Ustawienia sesji
          </h2>
          <label className="block text-sm text-white/70 mb-1">
            Czas na odpowiedzi (minuty)
          </label>
          <input
            type="number"
            min={1}
            max={15}
            value={duration}
            onChange={(e) =>
              setDuration(Math.min(15, Math.max(1, Number(e.target.value))))
            }
            className="w-24 bg-white/10 border border-white/20 rounded p-2 text-white text-center focus:outline-none focus:border-gold"
          />
        </section>

        {/* Connection status */}
        <section className="bg-white/5 rounded-lg p-6">
          <h2 className="text-gold font-bold text-lg mb-3">
            Status polaczen
          </h2>
          <p className="text-xl">
            Polaczeni:{" "}
            <span className="text-gold font-bold">{participantCount}</span>{" "}
            uczestnikow
          </p>
        </section>

        {/* Start button */}
        <button
          onClick={handleStart}
          disabled={loading}
          className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold text-xl py-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? "Uruchamianie..." : "START"}
        </button>
      </div>
    );
  }

  // ACTIVE or FINISHED
  return (
    <div className="space-y-6">
      {/* Timer */}
      {sessionStatus === "active" && timeLeft !== null && (
        <div className="text-center">
          <div
            className={`text-5xl font-bold font-mono ${
              timeLeft < 60000 ? "text-red-400" : "text-gold"
            }`}
          >
            {formatTime(timeLeft)}
          </div>
          <p className="text-white/50 text-sm mt-1">Pozostaly czas</p>
        </div>
      )}

      {sessionStatus === "active" && timeLeft === 0 && (
        <div className="text-center text-red-400 text-2xl font-bold">
          Czas minal!
        </div>
      )}

      {/* Participants */}
      <section className="bg-white/5 rounded-lg p-6">
        <h2 className="text-gold font-bold text-lg mb-3">
          Uczestnicy ({participants.length})
        </h2>
        {participants.length === 0 ? (
          <p className="text-white/50">Brak uczestnikow</p>
        ) : (
          <ul className="space-y-2">
            {participants.map((p) => (
              <li key={p.nick} className="flex items-center gap-2 text-sm">
                {p.status === "finished" ? (
                  <span className="text-green-400">&#10004;</span>
                ) : (
                  <span className="text-yellow-400">&#9679;</span>
                )}
                <span className="font-medium">{p.nick}</span>
                <span className="text-white/50">
                  {p.status === "finished"
                    ? "-- ukonczone"
                    : p.status === "in_progress"
                    ? `-- w trakcie (pytanie ${p.currentQuestion + 1}/3)`
                    : "-- oczekuje"}
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
          className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors"
        >
          Zakoncz wczesniej
        </button>
      )}

      {(sessionStatus === "finished" || (sessionStatus === "active" && timeLeft === 0)) && !summary && (
        <button
          onClick={handleGenerateSummary}
          disabled={generating}
          className="w-full bg-gold hover:bg-yellow-500 text-navy font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
        >
          {generating
            ? "Generowanie podsumowania..."
            : "Generuj wyniki grupy"}
        </button>
      )}

      {/* Summary */}
      {summary && (
        <section className="bg-white/5 rounded-lg p-6">
          <h2 className="text-gold font-bold text-lg mb-4">
            Wyniki grupy
          </h2>
          <div className="text-white/90 whitespace-pre-wrap leading-relaxed text-sm">
            {summary}
          </div>
        </section>
      )}

      {/* Reset */}
      <button
        onClick={handleReset}
        className="w-full border border-white/20 text-white/50 hover:text-white hover:border-white/40 py-2 rounded-lg text-sm transition-colors"
      >
        Resetuj sesje (nowa sesja)
      </button>
    </div>
  );
}
