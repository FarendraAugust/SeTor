# Deploy — SeTor Monitoring (3 VPS + Docker)

Arsitektur: **3 VPS identik** (postgres + worker + caddy opsional), **1 dashboard** di salah satu VPS.
Tiap VPS punya Postgres sendiri (DB `setor_shared` + `setor_local` per node). Worker saling terhubung
via HTTP (`PUBLIC_URL` + `PEER_SEEDS`) dilindungi `INTERNAL_TOKEN`.

```
VPS-1            VPS-2            VPS-3            (VPS-1 juga)
postgres  ──┐    postgres ──┐    postgres ──┐    dashboard:3000 ── caddy (HTTPS)
worker ─────┘─┐  worker ─────┘── worker ─────┘─── worker:3101 ── caddy (HTTPS, opsional)
3101 ──────────┘───────────────┘
```

## Prasyarat per VPS

- Docker Engine + Compose v2 (`docker compose version`)
- `ufw` firewall

## 1. Node worker (dijalankan di 3 VPS)

```bash
git clone <repo> setor && cd setor
cp deploy/env/node1.env.example .env   # node2/3 pakai env yang sesuai
nano .env
```

Isi `.env` dengan benar:

| Var | Nilai |
|---|---|
| `WORKER_ID` | `setor-1`, `setor-2`, `setor-3` — beda tiap VPS |
| `PUBLIC_URL` | `http://<IP_VPS_N>:3101` — URL publik VPS ini |
| `PEER_SEEDS` | URL publik 2 VPS lainnya (dipisah koma) |
| `PG_PASSWORD` | acak, `openssl rand -base64 24` (boleh beda per VPS) |
| `JWT_SECRET` | **sama di 3 VPS**: `openssl rand -base64 48` |
| `INTERNAL_TOKEN` | **sama di 3 VPS**: `openssl rand -base64 48` |
| `CORS_ORIGINS` | domain dashboard + `http://localhost:3000` |

> `JWT_SECRET` harus sama agar token login valid saat failover; `INTERNAL_TOKEN` sama agar peer bisa join.

Firewall (buka 3101 hanya untuk sesama VPS):

```bash
ufw allow OpenSSH
ufw allow from <IP_VPS_1> to any port 3101
ufw allow from <IP_VPS_2> to any port 3101
ufw allow from <IP_VPS_3> to any port 3101
ufw enable
```

Start:

```bash
docker compose up -d --build
```

- Entrypoint otomatis migrasi **shared DB lalu local DB** (journal berisi semua tabel), baru start worker.
- Migrasi idempotent — aman di setiap restart.

## 2. Dashboard (satu VPS saja)

```bash
cp deploy/env/dashboard.env.example .env
nano .env   # NEXT_PUBLIC_WORKER_URLS = worker domains/URLs, DASH_DOMAIN = domain dashboard
docker compose -f compose.dashboard.yaml up -d --build
```

> `NEXT_PUBLIC_*` di-inline **saat build**. Jika URL worker berubah, rebuild image:
> `docker compose -f compose.dashboard.yaml build --no-cache dashboard && docker compose -f compose.dashboard.yaml up -d`

HTTPS otomatis via Caddy (Let's Encrypt) — pastikan DNS `dashboard.example.com` mengarah ke VPS ini.

## 3. (Opsional) HTTPS untuk worker API

Jika dashboard memakai `https://worker1.example.com` dsb, aktifkan profile proxy di tiap VPS:

```bash
# tambahkan di .env:
WORKER_DOMAIN=worker1.example.com     # beda per VPS
docker compose --profile proxy up -d
```

Tanpa domain, biarkan `NEXT_PUBLIC_WORKER_URLS` memakai `http://<IP>:3101` langsung.

## Verifikasi

```bash
# 1. Leader election — semua node menjawab, leaderId sama
curl -s "http://localhost:3101/internal/leader?token=<INTERNAL_TOKEN>"

# 2. Auth: tanpa token 401, dengan JWT 200 (login via dashboard)
curl -s http://localhost:3101/workers -o /dev/null -w '%{http_code}\n'   # 401

# 3. Failover: matikan leader, ~45s kemudian node lain naik
docker compose stop worker && docker compose logs -f worker --tail=20

# 4. Dashboard: https://dashboard.example.com → login → halaman /cluster
#    badge header n/n, crown di leader, readout mencatat election & failover

# 5. Notifikasi Telegram: matikan target → alert DOWN terkirim, hidupkan → UP
```

## Troubleshooting

- **Registry tidak konsisten (dua crown / offline palsu)**: sudah di-fix — follower kini ikut
  probe semua peer tiap heartbeat, dan node offline tidak lagi ditandai leader.
- **Migrasi gagal di container baru**: pastikan volume postgres benar-benar fresh
  (`docker compose down -v` hanya di lingkungan uji — hapus data).
- **DB local belum ada**: hanya dibuat saat volume postgres pertama kali (via
  `deploy/postgres-init.sql`). Jika volume lama, buat manual:
  `docker exec -it setor-postgres-1 psql -U setor -c "CREATE DATABASE setor_local;"`
- **Pengembangan lokal tanpa Docker**: `worker/scripts/start-cluster.sh` (worker + worker-1 + dashboard,
  bun dev). `Dockerfile.local` di dashboard hanya untuk mesin yang jaringan container ke npm registry-nya
  lambat (buat local test via compose `DASH_DOCKERFILE=Dockerfile.local`).
- **Port host worker**: `WORKER_PORT` di `.env` hanya mengubah port HOST; container selalu listen 3101.
