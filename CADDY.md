# Caddy / Gateway — chatwork ui-next

App này (UI ở `ui-next/`) **không tự chạy ngrok**. Việc expose ra Internet do **gateway dùng chung**
lo: [`~/IdeaProjects/gateway`](../gateway/CADDY.md) (1 Caddy + 1 ngrok cho nhiều app, 1 domain).

## Vai trò của chatwork trong gateway

|          |                                                                     |
|----------|---------------------------------------------------------------------|
| Prefix   | **`/ai`** (`https://<domain>/ai`)                                   |
| Port     | **5000** (`PORT` trong `ui-next/.env`; gateway dùng `AI_PORT=5000`) |
| basePath | `NEXT_PUBLIC_BASE_PATH=/ai` — **baked lúc `next build`**            |

Next tự prefix Link/asset/API route bằng basePath; riêng `fetch`/`EventSource` được prefix thủ công
trong `ui-next/app/_components/AgentConsole.jsx` qua hằng `BASE`.

## Chạy

```bash
# 1. App (port 5000, basePath /ai)
cd ui-next && npm run build && pm2 start ecosystem.config.js   # chỉ Next app, KHÔNG ngrok
# 2. Gateway (cài Caddy + chạy 1 lần — xem ~/IdeaProjects/gateway/CADDY.md)
cd ~/IdeaProjects/gateway && pm2 start ecosystem.config.js
```
→ `https://<domain>/ai`

## Lưu ý

- Đổi `NEXT_PUBLIC_BASE_PATH` → phải `npm run build` lại (baked vào bundle).
- Chạy độc lập không qua gateway: để `NEXT_PUBLIC_BASE_PATH=` rỗng + build lại → app ở `/`.
- Cài Caddy + cách thêm app mới: xem **[gateway/CADDY.md](../gateway/CADDY.md)**.
