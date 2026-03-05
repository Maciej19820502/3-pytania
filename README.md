# 3 pytania | DFE.academy

Grupowy diagnostyczny czat z AI, uruchamiany przez administratora w czasie rzeczywistym.

## Stack technologiczny

- Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Upstash Redis (przechowywanie stanu sesji)
- Claude API (claude-haiku-4-5) z fallbackiem na OpenAI (gpt-4o-mini)
- Polling co 3 sekundy (kompatybilne z Vercel)

## Wdrozenie na Vercel — krok po kroku

1. **Repozytorium**: Wrzuc kod do repozytorium Git (GitHub/GitLab/Bitbucket).

2. **Upstash Redis**:
   - Zaloz konto na [upstash.com](https://upstash.com)
   - Stworz nowa baze Redis
   - Skopiuj `UPSTASH_REDIS_REST_URL` i `UPSTASH_REDIS_REST_TOKEN`

3. **Klucze API**:
   - Wygeneruj klucz API na [console.anthropic.com](https://console.anthropic.com) (Claude)
   - Opcjonalnie: klucz OpenAI na [platform.openai.com](https://platform.openai.com) (fallback)

4. **Vercel**:
   - Zaimportuj projekt z repozytorium na [vercel.com](https://vercel.com)
   - W ustawieniach projektu dodaj zmienne srodowiskowe:
     - `ANTHROPIC_API_KEY`
     - `OPENAI_API_KEY` (opcjonalnie)
     - `UPSTASH_REDIS_REST_URL`
     - `UPSTASH_REDIS_REST_TOKEN`
   - Kliknij Deploy

## Uruchomienie lokalne

```bash
# 1. Zainstaluj zaleznosci
npm install

# 2. Skopiuj plik konfiguracyjny i uzupelnij klucze
cp .env.local.example .env.local

# 3. Uruchom serwer deweloperski
npm run dev
```

- Admin: http://localhost:3000/admin
- Uczestnicy: http://localhost:3000

## Jak uzywac

1. Admin otwiera `/admin` i konfiguruje sesje (kontekst, pytania, czas)
2. Uczestnicy otwieraja `/` i wpisuja imie/nick
3. Admin klika START — sesja rusza na wszystkich ekranach jednoczesnie
4. AI prowadzi indywidualny czat z kazdym uczestnikiem (3 pytania)
5. Po zakonczeniu admin generuje podsumowanie grupowe
6. Wyniki pojawiaja sie u wszystkich uczestnikow

## Struktura kluczy Redis

| Klucz | Opis | TTL |
|---|---|---|
| `session:config` | Konfiguracja sesji | 24h |
| `session:status` | Status: waiting/active/finished | 24h |
| `session:participants` | Hash z danymi uczestnikow | 24h |
| `session:summary` | Podsumowanie grupowe | 24h |
