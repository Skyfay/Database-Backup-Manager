# Projekt Status & ToDo (Stand: 07.01.2026)

## ✅ Erledigt

### 1. Projekt-Wiederherstellung
- **Docker Fixes:**
    - Port von `5000` auf `5001` geändert (um Konflikte auf macOS zu vermeiden).
    - `docker-compose.yml` geprüft, alle Services (App, MySQL, Postgres, Mongo) laufen.
- **Bugfixes:**
    - `src/server/database_setup.py`: Code hinzugefügt, um den fehlenden Ordner für `local.db` automatisch zu erstellen.
    - **Login:** Veraltete `generate_password_hash(method='sha256')` korrigiert. Login funktioniert nun wieder (`Admin` / `Password`).

### 2. Vorbereitung der Tools
- **Dockerfile Update:**
    - Folgende Clients wurden im Image installiert:
        - `mariadb-client` (für `mysqldump`)
        - `postgresql-client` (für `pg_dump`)
        - `mongodb-tools` (für `mongodump`)
    - Container wurde neu gebaut (`docker-compose up -d --build`) und die Verfügbarkeit der Tools verifiziert.

---

## 🚀 Nächste Schritte

### 1. Backup-Logik (Backend)
- [ ] Python-Funktion erstellen, die `mysqldump`, `pg_dump` etc. via `subprocess` aufruft.
- [ ] Speicherort für Dumps definieren (z.B. `/app/backups`) und als Volume mounten, damit sie nicht verloren gehen.

### 2. UI & Frontend
- [ ] "Backups"-Seite (aus Figma Design) implementieren.
- [ ] Button "Backup jetzt testen" hinzufügen, um die Logik manuell auszulösen.

### 3. Erweiterte Features
- [ ] **Komprimierung:** Dumps als `.zip` oder `.tar.gz` speichern.
- [ ] **Verschlüsselung:** Optionales Encrypten der Archive.
- [ ] **Scheduler:** Einrichten eines Task-Schedulers (z.B. `APScheduler`) für automatische Cronjob-Backups.

### 4. Code Cleanup
- [ ] Ggf. alte jQuery-Teile modernisieren oder Code aufräumen, falls nötig.

---

## ℹ️ Quick Start für das nächste Mal

```bash
# Services starten
docker-compose up -d

# App öffnen
# http://localhost:5001
```
