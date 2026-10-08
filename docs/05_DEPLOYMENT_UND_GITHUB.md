# Deployment und GitHub – Ablauf für Agenten

Gilt für alle Coding-Agenten (Claude Code u. a.). Kurzfassung steht in `CLAUDE.md`.

## Eckdaten

| Punkt | Wert |
|---|---|
| GitHub-Repo | https://github.com/cptnred/BatteryBuilderTool (öffentlich, Branch `main`, Account `cptnred`, Zugriff per `gh`) |
| Live-URL | https://apps.pev-point.de/battery/ |
| Hosting | Caddy hinter Nginx Proxy Manager; jeder Ordner im Webroot ist eine App, Webroot ist schreibgeschützt |
| Upload | `rsync` über SSH, Benutzer `deploy-apps`, nur Schlüssel, nur rsync (kein Shell/SFTP/scp) |
| Ziel | `deploy-apps@apps.pev-point.de:battery/` (relativ zum Webroot) |
| Basispfad | `base: './'` in `vite.config.ts` – Assets sind relativ, App läuft unter `/battery/` |
| Routing | Kein Router, Zustand im URL-Hash → kein SPA-Fallback nötig |
| Speicher | Alle Apps teilen sich `localStorage`; Schlüssel immer mit Präfix `akku-konfigurator:` |

## Deployen

1. Arbeitsbaum committen (siehe GitHub unten). Nur deployen, was auch auf `main` liegt.
2. `npm run deploy` (= `pwsh -NoProfile -File deploy.ps1`). Das Skript macht: Tests → Lint → Build →
   rsync nach `battery/`. Bricht bei jedem Fehler ab.
3. **Zuerst Probelauf:** `.\deploy.ps1 -DryRun` zeigt, was übertragen/gelöscht würde.
4. Danach prüfen (nicht nur annehmen):
   - `curl -sI https://apps.pev-point.de/battery/` → `200`
   - eine Asset-Datei aus `dist/assets/` per `curl -sI` → `200`, `Cache-Control: ...immutable`
   - ein Datenblatt-Link, z. B. `/battery/datasheets/Datasheet%20JP30.pdf` → `200`
   - Seite im Browser öffnen: keine Konsolenfehler, PDF-Export funktioniert.

Voraussetzungen auf dem Rechner (Windows):
- cwRsync (kostenloser Client von itefix.net) unter `C:\Tools\cwrsync`, sonst `-CwRsync <Pfad>` oder `$env:CWRSYNC_HOME`.
  Das mitgelieferte `ssh.exe` benutzen, nicht das Windows-OpenSSH.
- SSH-Schlüssel `~\.ssh\id_ed25519`; der öffentliche Teil ist auf dem Server für `deploy-apps` eingetragen.
- Parameter: `-DryRun`, `-SkipChecks` (nur für Notfälle, nie ohne Grund), `-Key`, `-CwRsync`.

### Regeln für Agenten beim Deployen

- **Nur auf ausdrückliche Anfrage des Nutzers deployen.** Ein Deployment macht die App öffentlich und ist
  nicht rückholbar. Freigabe für ein Deployment gilt nicht für das nächste.
- **Ziel `battery/` nie ändern oder leeren.** `--delete` ohne App-Ordner löscht alle anderen Apps auf dem Server.
- Keine Dateien direkt auf dem Server ändern, kein Zugang außer rsync. Keine Server-Konfiguration anfassen
  (gehört dem Server-Admin, Martin).
- Tests/Lint/Build müssen grün sein. Nicht `-SkipChecks` benutzen, um ein rotes Ergebnis zu umgehen.
- Keine Secrets im Bundle (alles in `dist/` ist öffentlich). Keine absoluten Pfade ab `/` (`/assets/…`, `/api/…`),
  keine `http://`-Links auf die eigene Domain, kein Schreiben ins Webroot zur Laufzeit.
- Neue `localStorage`-/IndexedDB-Schlüssel mit Präfix `akku-konfigurator:`.
- Externe Ressourcen (aktuell Google Fonts) nur ergänzen, wenn nötig. Der Server setzt derzeit keine CSP;
  käme eine dazu, müssen Google Fonts erlaubt oder lokal eingebunden werden.
- Schlägt der Upload fehl (`UNPROTECTED PRIVATE KEY FILE`, Host-Key, Verbindung): Fehler melden,
  nicht `StrictHostKeyChecking=no` o. Ä. setzen. Den Host-Key-Fingerabdruck erst mit dem Nutzer abgleichen.

## GitHub

- Remote `origin` = `https://github.com/cptnred/BatteryBuilderTool`, Authentifizierung über `gh` (HTTPS, Keyring).
  Status prüfen: `gh auth status`.
- Aktuell wird direkt auf `main` gearbeitet. Größere oder riskante Änderungen auf einem Branch
  (`feature/<thema>`, `fix/<thema>`) und per Pull Request (`gh pr create`) einbringen.
- **Vor jedem Commit:** `npm test`, `npm run lint`, `npm run build` grün (siehe `CLAUDE.md`, Abschnitt Stil).
- Commits: kurze deutsche oder englische Betreffzeile im Imperativ/Präsens, ein Thema pro Commit.
  Attribution-Zeile am Ende, wie sie der Agent-Harness vorgibt (`Co-Authored-By: …`).
- Committen und pushen nur auf Anfrage des Nutzers.
- **Nie:** `git push --force` auf `main`, `--no-verify`, History umschreiben, nachdem gepusht wurde,
  Branches/Tags löschen ohne Auftrag.
- **Nie committen:** SSH-Schlüssel, Tokens, `.env`-Dateien, Passwörter. Das Repo ist **öffentlich** –
  jeder Commit ist weltweit lesbar und bleibt in der Historie, auch wenn er später gelöscht wird.
  Vor dem Staging `git status`/`git diff --staged` ansehen; `git add -A` nur, wenn klar ist, was drin ist.
- `dist/`, `node_modules/`, `test-results/`, `playwright-report/` stehen in `.gitignore` und bleiben draußen.
- Fixtures (`reference/fixtures/*.json`) und **[BESTÄTIGT]**-Regeln werden nicht geändert, um Tests grün zu bekommen
  (harte Regel aus `CLAUDE.md`).

## Typischer Ablauf „Änderung live bringen"

```powershell
npm test; npm run lint; npm run build          # alles grün?
git status; git diff                           # was geht ins Commit?
git add <Dateien>; git commit -m "…"           # nur auf Anfrage
git push                                       # nur auf Anfrage
.\deploy.ps1 -DryRun                           # Probelauf
npm run deploy                                 # nur auf Anfrage; danach Live-Prüfung (siehe oben)
```

## Rollback

Es gibt keinen Server-seitigen Verlauf. Zurückrollen = vorherigen Stand aus Git auschecken
(`git switch --detach <commit>` oder Revert-Commit), neu bauen und erneut deployen.
