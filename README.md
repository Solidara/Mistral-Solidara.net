# MongoDB-Setup (Docker Compose)

Dieses Dokument beschreibt das Aufsetzen von MongoDB 8 auf dem Hetzner-Server für die Backend-Entwicklung.

## Architektur-Entscheidungen

- **MongoDB läuft ausschließlich intern** im Docker-Compose-Netz. Es gibt keine `ports`-Freigabe, die Datenbank ist damit nicht öffentlich aus dem Internet erreichbar. Backend-Services im selben Compose-Netz erreichen sie über `mongodb:27017`.
- **Authentifizierung** über einen Root-User (`root`), dessen Passwort aus Umgebungsvariablen gelesen wird und nicht in der Compose-Datei steht.
- **Persistenz** über ein Named Volume (`mongo-data`) statt eines Bind-Mounts – robuster gegen versehentliche Löschungen und Berechtigungsprobleme.

## docker-compose.yml

```yaml
services:
  mongodb:
    image: mongo:8
    container_name: mongodb
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: root
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_PASSWORD}
    volumes:
      - mongo-data:/data/db
    healthcheck:
      test: ["CMD", "mongosh", "--quiet", "--eval", "db.adminCommand('ping').ok"]
      interval: 30s
      timeout: 10s
      retries: 5
    ulimits:
      nofile:
        soft: 65536
        hard: 65536

volumes:
  mongo-data:
```

Hinweise:

- `MONGO_INITDB_ROOT_USERNAME/PASSWORD` legen den Root-User **nur beim allerersten Start** mit leerem Datenverzeichnis an. Eine spätere Passwort-Änderung in der Compose-Datei wirkt sich nicht auf den bestehenden User aus.
- Der Healthcheck nutzt `mongosh` (im `mongo:8`-Image enthalten) und `db.adminCommand('ping')`, das auch ohne Auth funktioniert.

## Root-Passwort anlegen

Passwort generieren und in einer `.env`-Datei neben der `docker-compose.yml` ablegen. Docker Compose liest diese Datei automatisch ein und ersetzt `${MONGO_PASSWORD}`.

```bash
openssl rand -base64 32
echo "MONGO_PASSWORD=<generiertes-passwort>" > .env
chmod 600 .env
```

`.env` darf nie eingecheckt werden:

```
# .gitignore
.env
```

## Starten und Prüfen

```bash
docker compose up -d
docker compose ps
docker compose logs -f mongodb
```

Verbindungstest auf dem Server (interaktive Shell):

```bash
docker exec -it mongodb mongosh -u root -p
```

## Zugriff aus dem Backend

Services im selben Compose-Netz verbinden sich mit:

```
mongodb://root:<passwort>@mongodb:27017/<datenbank>
```

Damit ein Backend-Container im selben Netz läuft, füge ihn als weiteren Service in derselben `docker-compose.yml` hinzu oder verbinde die Netzwerke (`external_links`/gemeinsames `networks`-Segment).

## Behobene Startwarnungen

Beim ersten Start meldete MongoDB drei Warnungen:

1. **XFS empfohlen** – das Host-Dateisystem ist ext4. Für Entwicklung und moderate Last unkritisch, daher akzeptiert. Bei einer späteren großen Produktiv-DB mit hohem I/O sollte das Datenverzeichnis auf eine eigene XFS-Partition gelegt werden.
2. **„Soft rlimits for open file descriptors too low"** – behoben über die `ulimits`-Sektion (`nofile` 65536/65536) in der Compose-Datei.
3. **Transparent Huge Pages (sysfsFile-Hinweis)** – THP sollte deaktiviert werden. Auf dem Host eingerichtet über einen systemd-Service:

```ini
# /etc/systemd/system/disable-thp.service
[Unit]
Description=Disable Transparent Huge Pages
DefaultDependencies=no
After=sysinit.target local-fs.target
Before=mongod.service docker.service

[Service]
Type=oneshot
ExecStart=/bin/sh -c "echo never > /sys/kernel/mm/transparent_hugepage/enabled"
ExecStart=/bin/sh -c "echo never > /sys/kernel/mm/transparent_hugepage/defrag"
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable disable-thp.service
sudo systemctl start disable-thp.service
sudo systemctl restart docker
```

## Betrieb / Nützliche Befehle

```bash
# Backup erstellen
docker exec mongodb mongodump -u root -p "$MONGO_PASSWORD" --archive --gzip > backup.gz

# Backup einspielen
docker exec -i mongodb mongorestore -u root -p "$MONGO_PASSWORD" --archive --gzip < backup.gz

# Stack neu starten
docker compose restart mongodb

# Runterfahren (Volume bleibt erhalten)
docker compose down
```

> **Achtung:** `docker compose down -v` löscht das Named Volume und damit alle Daten.

## Backend deployen

Das Express-Backend (`backend/`) läuft als zweiter Service in derselben `docker-compose.yml` im selben Netz wie MongoDB.

### Erst-Deployment auf dem Hetzner-Server

```bash
git pull
docker compose up -d --build
```

Der Backend-Container wartet auf den MongoDB-Healthcheck (`depends_on: condition: service_healthy`) und verbindet sich dann intern über `mongodb://root:${MONGO_PASSWORD}@mongodb:27017/solidara?authSource=admin`.

### Smoke-Test

```bash
# Service-Info
curl -s http://localhost:3000/

# DB-Verbindung prüfen
curl -s http://localhost:3000/api/health

# Beispiel-Datensatz anlegen
curl -s -X POST http://localhost:3000/api/pings \
  -H "Content-Type: application/json" \
  -d '{"name":"erstes-ping","message":"hello"}'

# Datensätze abrufen
curl -s http://localhost:3000/api/pings
```

### Sicherheits-Hinweise

- Der Backend-Port ist bewusst nur auf `127.0.0.1:3000` gebunden (`ports: "127.0.0.1:3000:3000"`), also **nicht** öffentlich aus dem Internet erreichbar. Für späteren öffentlichen Zugriff sollte ein Reverse-Proxy (z. B. Caddy/Nginx mit TLS) vorgeschaltet werden.
- MongoDB bleibt wie bisher ohne Port-Freigabe; sie ist nur innerhalb des Compose-Netzes erreichbar.

### Backend-Entwicklung lokal

```bash
cd backend
cp .env.example .env   # MONGODB_URI anpassen
npm install
npm run dev
```
