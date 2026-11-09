# MatchLiveRoom — 24H 全球運動與電競賽事即時直播間

零成本、純前端、24 小時自動輪播的全球運動與電競賽事即時直播間網頁，部署於 GitHub Pages（`Johntsai0320/MatchLiveRoom`）。

## 核心特色

1. **零成本、無後端、100% 真實數據**：
   - 不架設任何後端伺服器、不使用模擬假資料，由瀏覽器純前端直接串接公開免費的：
     - **ESPN Public API v2**（`/scoreboard` 與 `/summary?event={id}`）
     - **Riot LoL Esports Official Public API**（`esports-api.lolesports.com/persisted/gw` 的 `getLive`、`getSchedule`、`getEventDetails` 與 `feed.lolesports.com/livestats/v1/window/{gameId}` 峽谷即時數據流）
2. **24 小時跨時區全球輪播（含電競與傳統體育）**：
   - 聚合 **🏆 LOL 世界大賽 (Worlds / MSI / First Stand)、🎮 LOL 職業聯賽 (LCK / LPL / LCP / LEC / LCS)、NBA、MLB、英超 (EPL)、西甲 (LaLiga)、歐冠 (UCL)、NHL、NFL** 等全球跨時區聯賽。
   - 自動依照賽事狀態排序：**LIVE 進行中 (`state === 'in'`) 最優先** → 即將開賽 (`pre`) → 近期完賽 (`post`)。
   - 內建可調式定時輪播器（15s / 25s / 45s / 60s、暫停/繼續、上/下一場切換、聯賽篩選分頁）。
3. **沉浸式暗色系直播間介面**：
   - **即時比分看板 (Jumbotron Scoreboard)**：呈現隊徽、藍紅方/主客隊标识、BO3/BO5 系列賽局數 (`G1~G5`) 或傳統運動各節/各局小分表 (`Linescore`)、即時經濟/勝率氣勢條與得分閃爍動畫。
   - **現場文字動態 (Play-by-Play)**：即時串流 ESPN 比賽逐球紀錄與 LoL 召喚師峽谷即時擊殺、巴龍 (Baron)、防禦塔推進與系列賽戰況，支援「全部動態」與「關鍵/得分」篩選。
   - **技術統計與焦點選手 (Boxscore & Leaders)**：雙向長條圖呈現團隊數據對比（如 LoL 總擊殺、團隊總經濟、防禦塔、巴龍、元素飛龍，以及球類運動技術指標），並透過 Riot Data Dragon CDN 顯示十位選手選用英雄頭像、路線 (`TOP/JGL/MID/BOT/SUP`)、即時 `KDA`、`CS` 與經濟。
   - **球迷互動區 (Fan Zone)**：即時勝負預測投票、電競/體育一鍵應援彈幕、即時聊天室與主記分板浮動彈幕層。

## 本地預覽與部署

- 直接以靜態伺服器開啟根目錄（例如 `npx serve .` 或 `python3 -m http.server 8080`）。
- 推送至 `Johntsai0320/MatchLiveRoom` 的 `main` 分支即可透過 `.github/workflows/deploy.yml` 自動部署至 GitHub Pages。
