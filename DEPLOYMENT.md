# nursery-mgmt — Production Deployment

How to ship the React ERP frontend to **https://erp.rambiotechplants.com**.

This app is **not** deployed via Render for production ERP. Production runs as static files on a **DigitalOcean droplet** behind nginx.

---

## Quick deploy (copy-paste)

From your machine, inside `nursery-mgmt/`:

```bash
# 1. Pull latest
git checkout new-prod
git pull origin new-prod

# 2. Install deps (if package.json changed)
npm ci

# 3. Production build (uses .env.prod — do NOT commit that file)
rm -rf node_modules/.cache .eslintcache
CI=true npm run build:prod

# 4. Upload build to droplet (replace SSH user/host if needed)
rsync -avz --delete --exclude '.DS_Store' \
  build/ \
  root@167.71.232.6:/var/www/erp-frontend/

# 5. Verify live bundle (hash changes every release)
curl -s https://erp.rambiotechplants.com/ | grep -o 'main\.[a-f0-9]*\.js' | head -1
```

Hard refresh the browser after deploy: **Cmd+Shift+R** / **Ctrl+Shift+R**.

---

## Server layout (DigitalOcean)

| Item | Value |
|------|--------|
| Host | `167.71.232.6` |
| SSH | `ssh root@167.71.232.6` (use SSH keys; password only as fallback) |
| Public URL | https://erp.rambiotechplants.com |
| Web root | `/var/www/erp-frontend` (nginx `root`; not `/var/www/frontend`) |
| Nginx site | `/etc/nginx/sites-enabled/` → `server_name erp.rambiotechplants.com` |
| Backend API (prod) | `https://api1.rambiotechplants.com/api/v1` (from `.env.prod`) |

### Other sites on the same droplet (do not overwrite)

| Domain | Path |
|--------|------|
| erp.rambiotechplants.com | `/var/www/erp-frontend` ← **this app** |
| md.rambiotechplants.com | `/var/www/md.rambiotechplants.com` |
| mobile.rambiotechplants.com | `/var/www/mobile.rambiotechplants.com` |
| shed.rambiotechplants.com | `/var/www/shed.rambiotechplants.com` |
| api1.rambiotechplants.com | PM2 `erp-backend` → `/var/www/FINAL_NURSERY_BE` |

---

## Git workflow

| Item | Value |
|------|--------|
| Repo | `git@github.com:vivek-JS/nursery-mgmt.git` |
| Production branch | `new-prod` |
| Parent monorepo | `ram` tracks `nursery-mgmt` as a submodule (optional pointer update) |

### Commit rules

- **Never commit** `.env.dev`, `.env.prod`, or other secrets.
- Push to `new-prod` before deploying so the server build matches git history.

```bash
git add -A
git reset HEAD .env.dev .env.prod   # keep env local
git commit -m "Your message"
git push origin new-prod
```

---

## Build commands

| Command | Purpose |
|---------|---------|
| `npm start` | Local dev (`.env.dev`) |
| `npm run build:prod` | Production static build → `build/` |
| `CI=true npm run build:prod` | Same as prod; **required** before deploy — ESLint warnings fail the build when `CI=true` |

### If build fails on unused imports

Fix eslint `unused-imports/no-unused-imports` errors, then clear cache and rebuild:

```bash
rm -rf node_modules/.cache .eslintcache
CI=true npm run build:prod
```

---

## Deploy methods

### A. Recommended — rsync local `build/` (what we use)

Fast and matches what was tested locally.

```bash
rsync -avz --delete --exclude '.DS_Store' \
  build/ \
  root@167.71.232.6:/var/www/erp-frontend/
```

`--delete` removes old JS chunks so users do not load stale bundles.

### B. Build on the server (alternative)

Only if the repo is cloned on the droplet:

```bash
ssh root@167.71.232.6
cd /path/to/nursery-mgmt   # if cloned there
git pull origin new-prod
npm ci
CI=true npm run build:prod
rsync -av --delete build/ /var/www/erp-frontend/
```

Currently production uses **method A** — static files in `/var/www/frontend` with no git checkout on server.

### C. Render (not production ERP)

`render.yaml` exists for a static Render deploy (`ram-biotek-backend.onrender.com` API). That is **separate** from `erp.rambiotechplants.com`. Do not confuse the two.

---

## Post-deploy checks

1. **Homepage loads**
   ```bash
   curl -sI https://erp.rambiotechplants.com/u/dashboard | head -3
   ```
   Expect `HTTP/1.1 200 OK`.

2. **New JS bundle** — compare `main.*.js` in `build/index.html` vs live HTML.

3. **Login** — sign in at https://erp.rambiotechplants.com/auth/login and confirm redirect to `/u/dashboard`.

4. **API** — browser network tab should hit `api1.rambiotechplants.com`, not localhost.

5. **PM2 backend** (only if API issues, not for frontend-only changes):
   ```bash
   ssh root@167.71.232.6 'pm2 list'
   # erp-backend should be online
   ```

---

## Nginx notes

ERP is a SPA. Config pattern:

```nginx
root /var/www/erp-frontend;
location / {
    try_files $uri $uri/ /index.html;
}
location = /index.html {
    add_header Cache-Control "no-store, no-cache, must-revalidate, max-age=0";
}
```

After nginx config edits only:

```bash
ssh root@167.71.232.6 'nginx -t && systemctl reload nginx'
```

Frontend deploy does **not** require nginx reload.

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Old UI after deploy | Hard refresh; check live `main.*.js` hash changed |
| `CI=true` build fails | Remove unused imports; clear eslint cache |
| 404 on deep links (`/u/dashboard`) | nginx `try_files` → `/index.html` missing or wrong `root` |
| Login works but API errors | Check `.env.prod` `REACT_APP_BASE_URL`; rebuild and redeploy |
| Blank page / chunk load error | Stale chunks — redeploy with `rsync --delete` |
| Wrong site updated | Confirm target is `/var/www/erp-frontend`, not `/var/www/frontend` or `md.*` / `mobile.*` |

---

## Environment files (local only)

| File | Used by |
|------|---------|
| `.env.dev` | `npm start` |
| `.env.prod` | `npm run build:prod` |

Key prod vars (see `.env.prod` locally):

- `REACT_APP_BASE_URL` → API base
- `REACT_APP_APP_ENV` → `prod` (affects localStorage key prefix)

---

## One-liner for agents / future sessions

```bash
cd nursery-mgmt && git pull origin new-prod && rm -rf node_modules/.cache .eslintcache && CI=true npm run build:prod && rsync -avz --delete --exclude '.DS_Store' build/ root@167.71.232.6:/var/www/erp-frontend/ && curl -s https://erp.rambiotechplants.com/ | grep -o 'main\.[a-f0-9]*\.js' | head -1
```

Requires SSH access to `167.71.232.6` and a local `.env.prod` (not in git).
