# Schnellstart

Willkommen beim Database Backup Manager. Hier erfährst du, wie du das System startest.

## Voraussetzungen

- Docker & Docker Compose
- Node.js 20+ (nur für lokale Entwicklung ohne Docker)

## Installation mit Docker

Die einfachste Methode, den Backup Manager zu betreiben, ist Docker Compose.

1. **Repository klonen**
   ```bash
   git clone https://github.com/database-backup-manager/database-backup-manager.git
   cd database-backup-manager
   ```

2. **Starten**
   ```bash
   docker-compose up -d
   ```

3. **Zugriff**
   Öffne deinen Browser und gehe auf `http://localhost:3000`.

## Erste Schritte

1. **Benutzer erstellen**: Beim ersten Start wirst du aufgefordert, einen Admin-Account zu erstellen.
2. **Speicherort definieren**: Konfiguriere unter "Destinations" einen Speicherort (z.B. Lokaler Ordner oder S3).
3. **Datenbank hinzufügen**: Füge unter "Sources" deine erste Datenbank hinzu.
4. **Job erstellen**: Verbinde Quelle und Ziel in einem Backup-Job unter "Jobs".
