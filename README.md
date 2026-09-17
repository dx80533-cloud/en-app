# 字庫派對 · 自架版

GEPT 初級～中高級 + 多益 / 雅思核心字 單字複習全棧 App。
已從平台（妙搭沙箱）遷移為**可完全自主掌控的獨立雲端 App**：自建後端 + 免帳號暱稱登入（裝置綁定）+ 自有資料庫（SQLite 單檔）。

- 字庫：**8160 字**（GEPT 初 2216 / 中 2536 / 中高 3072，TOEIC 1250，IELTS 570），繁體中文釋義、音標、英文定義、初/中級雙語例句
- 學習：5 種測驗題型 + 閃卡、4 種聽力題型（GEPT 聽力練習）、XP / 等級 / 連續天數遊戲化
- 發音：瀏覽器 Web Speech API（TTS），免金鑰
- 例句補齊：公開 API（dictionaryapi.dev）批次補齊
- 主題：6 種風格（預設 / 深夜 / 戰鬥陀螺 / 日漫 / 糖果 / 復古）
- 登入：**免帳號**，輸入暱稱即進入（裝置識別碼綁定進度，JWT httpOnly cookie）；下次回來自動重進
- 管理後台：`/admin` 匯入 CSV / JSON 字庫、手動加字、例句批次補齊

---

## 一、技術架構

```
React 19 + Vite 8 (client/)   ──►  NestJS 10 (server/)  ──►  SQLite 單檔 (data/vocab.db)
         ▲                                 │
         └────── axios (/api) ◄────────────┘   JWT httpOnly cookie
```

- 後端：NestJS 10 + Drizzle ORM（better-sqlite3）
- 前端：React 19 + Vite + Tailwind v4，SPA 由後端同源提供（`dist/client`）
- 資料庫：SQLite 單檔，`data/vocab.db`；首次啟動自動建表並 seed 8160 字（`data/wordbank.json`）
- 認證：免帳號訪客模式——前端產生裝置識別碼，`POST /api/auth/guest` 以暱稱＋裝置識別碼換取 JWT（httpOnly cookie，30 天）；同裝置永遠對應同一帳號，進度跨次瀏覽保留

## 二、本機快速啟動

需求：Node.js ≥ 22、npm ≥ 10

```bash
npm install
cp .env.example .env      # 至少修改 JWT_SECRET
npm run build             # 編譯 server + client
npm start                 # http://localhost:3000
```

開發模式（hot reload）：

```bash
npm run dev               # server :3000 + client :5173（proxy /api → :3000）
```

## 三、正式部署（VPS / 雲主機）

### 方式 A：Docker Compose（建議）

```bash
# 1. 設定環境變數
cat > .env <<'EOF'
JWT_SECRET=一串很長的隨機字串
APP_BASE_URL=https://vocab.example.com
COOKIE_SECURE=true
GOOGLE_CLIENT_ID=你的-client-id
GOOGLE_CLIENT_SECRET=你的-client-secret
EOF

# 2. 啟動
docker compose up -d --build
```

資料庫與字庫檔會掛載在 `./data`，升級容器不遺失。

### 方式 B：直接 Node 執行

```bash
npm ci
npm run build
JWT_SECRET=... APP_BASE_URL=https://vocab.example.com node dist/server/main.js
```

建議用 systemd 或 pm2 管理，並在前面加一層 **Nginx + HTTPS**（見下）。

### Nginx 反代範例（HTTPS）

```nginx
server {
  listen 443 ssl;
  server_name vocab.example.com;
  ssl_certificate     /etc/letsencrypt/live/vocab.example.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/vocab.example.com/privkey.pem;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
  }
}
```

部署於 HTTPS 時請把 `COOKIE_SECURE=true` 與 `APP_BASE_URL=https://…` 設定正確。

## 四、登入（免帳號）

本版已移除 email / Google 帳號登入，改為**暱稱即進場**：

- 首次使用：首頁輸入暱稱 → 「開始學習」→ 伺服器依裝置識別碼建立訪客帳號並簽發 JWT（httpOnly cookie）
- 再次使用：自動用本機記住的暱稱與裝置識別碼直接進場，不需輸入
- 更換暱稱：右上角選單 →「更換暱稱」（清除本機身分與 cookie）
- 進度、收藏、主題綁定在該裝置的訪客帳號上；清除瀏覽器資料等同換新帳號

> 舊的 email / Google 登入 API 仍保留於後端但介面不再使用。

## 五、環境變數

| 變數 | 說明 | 預設 |
|---|---|---|
| `SERVER_HOST` | 監聽位址 | `0.0.0.0` |
| `SERVER_PORT` | 埠號 | `3000` |
| `DB_PATH` | SQLite 檔路徑 | `data/vocab.db` |
| `SEED_PATH` | 種子字庫 JSON 路徑（首次啟動自動匯入） | `data/wordbank.json` |
| `JWT_SECRET` | JWT 簽章密鑰，**上線前務必改成隨機長字串** | — |
| `COOKIE_SECURE` | HTTPS 下設 `true` | `false` |
| `APP_BASE_URL` | 對外網址 | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | （保留但未使用，可留空） | 空 |

## 六、資料與備份

- 所有使用者資料都在 **`data/vocab.db`**（SQLite 單檔）。備份 = 複製這個檔案（建議先停寫或使用 SQLite backup）。
- 字庫種子 `data/wordbank.json` 僅在**空表**時自動匯入；之後加字請用 `/admin` 後台匯入（CSV / JSON，upsert「只補空不覆蓋」）。
- 手動重置字庫：刪除 `data/vocab.db` 後重啟，即會重新 seed（會同時清掉使用者進度，請先備份）。

## 七、擴充字庫

1. 後台最簡單：登入後右上角選單 →「管理後台」→ 匯入 CSV / JSON
2. 或編輯 `data/wordbank.json` 加字後，用後台匯入（避免直接重建 DB 清掉進度）
3. 字庫 JSON 格式（`banks` 可多值：`gept` / `toeic` / `ielts`）：

```json
[{ "word": "abandon", "display": "abandon", "pos": "v.", "zh": "放棄",
   "phonetic": "/əˈbændən/", "definition": "to leave completely",
   "example": "They had to abandon the car.", "banks": ["gept", "toeic"], "level": "中級" }]
```

## 八、與平台版（妙搭）的差異

| 項目 | 平台版 | 自架版 |
|---|---|---|
| 登入 | 僅飛書 / 手機（平台限制） | **免帳號：暱稱即進場（裝置綁定）** |
| 資料庫 | 平台託管 Postgres | 自有 SQLite 單檔，完全自主 |
| 部署 | 平台沙箱 | 你自己的伺服器 / Docker |
| 功能 | 全部既有功能 | 與平台版一致（8160 字 / 5 種題型+閃卡 / 4 種聽力 / 6 主題 / 後台匯入） |
| 代碼 | 沙箱內，無法存取 | 完整原始碼在你的手上 |

## 九、授權與資料來源

- GEPT 字表：LTTC 官方參考字表（PDF 解析）
- TOEIC 字表：NGSL Project – TOEIC Service List 1.2（CC BY-SA 4.0）
- 學術字表：Coxhead AWL（EAP Foundation 頁面）
- 釋義/音標：ECDICT 開源英中詞典（MIT）
- 例句：GEPT 初/中級開源語料 + dictionaryapi.dev（Free Dictionary API）
