export type Language = "pl" | "en";

export const translations = {
  pl: {
    // Admin
    sessionContext: "Kontekst sesji",
    participantContext: "Kontekst uczestnikow",
    questions: "Pytania",
    restoreDefaults: "Przywroc domyslne",
    question: "Pytanie",
    sessionSettings: "Ustawienia sesji",
    responseTime: "Czas na odpowiedzi (minuty)",
    connectionStatus: "Status polaczen",
    participantConnected: "uczestnik polaczony",
    participantsConnected: "uczestnikow polaczonych",
    startSession: "START SESJI",
    starting: "Uruchamianie...",
    timeRemaining: "Pozostaly czas",
    timeUp: "Czas minal!",
    participants: "Uczestnicy",
    noParticipants: "Brak uczestnikow",
    completed: "ukonczone",
    questionProgress: "pytanie",
    waiting: "oczekuje",
    endEarly: "Zakoncz wczesniej",
    generateResults: "Generuj wyniki grupy",
    generatingSummary: "Generowanie podsumowania...",
    groupResults: "Wyniki grupy",
    resetSession: "Resetuj sesje (nowa sesja)",
    resetConfirm:
      "Na pewno zresetowac sesje? Wszystkie dane zostana utracone.",

    // Participant
    joinSession: "Dolacz do sesji",
    enterName: "Wpisz swoje imie aby rozpoczac",
    namePlaceholder: "Twoje imie / nick",
    join: "Dolacz",
    waitingForStart: "Czekaj na start sesji",
    connectedAs: "Polaczono jako",
    sessionStartedByHost:
      "Sesja zostanie uruchomiona przez prowadzacego",
    doneWaiting: "Gotowe! Czekaj na wyniki grupy.",
    timeUpWaiting: "Czas minal. Czekaj na wyniki grupy.",
    yourAnswer: "Twoja odpowiedz...",

    // Defaults
    defaultContext:
      'Uczestnicy studiow podyplomowych "AI w finansach i controllingu" -- menedzerowie i specjalisci z dzialow finansowych, controllingu i audytu.',
    defaultQuestions: [
      "Jak czesto uzywasz narzedzi AI w swojej codziennej pracy? (nigdy / sporadycznie / regularnie / codziennie)",
      "Co najbardziej niepokoi Cie w zwiazku z AI w Twojej pracy zawodowej?",
      "Jakie narzedzie AI znasz z nazwy -- chocby jedno?",
    ],
  },
  en: {
    // Admin
    sessionContext: "Session context",
    participantContext: "Participant context",
    questions: "Questions",
    restoreDefaults: "Restore defaults",
    question: "Question",
    sessionSettings: "Session settings",
    responseTime: "Response time (minutes)",
    connectionStatus: "Connection status",
    participantConnected: "participant connected",
    participantsConnected: "participants connected",
    startSession: "START SESSION",
    starting: "Starting...",
    timeRemaining: "Time remaining",
    timeUp: "Time's up!",
    participants: "Participants",
    noParticipants: "No participants",
    completed: "completed",
    questionProgress: "question",
    waiting: "waiting",
    endEarly: "End early",
    generateResults: "Generate group results",
    generatingSummary: "Generating summary...",
    groupResults: "Group results",
    resetSession: "Reset session (new session)",
    resetConfirm:
      "Are you sure you want to reset the session? All data will be lost.",

    // Participant
    joinSession: "Join session",
    enterName: "Enter your name to start",
    namePlaceholder: "Your name / nickname",
    join: "Join",
    waitingForStart: "Waiting for session to start",
    connectedAs: "Connected as",
    sessionStartedByHost: "The session will be started by the host",
    doneWaiting: "Done! Waiting for group results.",
    timeUpWaiting: "Time's up. Waiting for group results.",
    yourAnswer: "Your answer...",

    // Defaults
    defaultContext:
      'Participants of postgraduate studies "AI in Finance and Controlling" -- managers and specialists from finance, controlling and audit departments.',
    defaultQuestions: [
      "How often do you use AI tools in your daily work? (never / occasionally / regularly / daily)",
      "What concerns you most about AI in your professional work?",
      "Can you name any AI tool -- even one?",
    ],
  },
} satisfies Record<Language, Record<string, string | string[]>>;
