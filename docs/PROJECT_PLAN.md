# 專案開發計畫書：《無名校區》(Unnamed Campus)

## 1. 遊戲目標與定位 (Project Overview)
- **專案名稱**：無名校區（暫定）
- **遊戲類型**：2D 側視橫向探索（Side-scrolling Exploration）懸疑恐怖敘事 RPG
- **技術棧**：
  - **遊戲引擎**：Phaser 3
  - **開發語言**：TypeScript (Strict Mode)
  - **建置工具**：Vite
- **核心體驗**：
  - 玩家在陰暗、具壓迫感的校區走廊與教室間進行 2D 橫向移動與探索。
  - 透過調查環境物件、收集線索、與 NPC 對話、觸發劇情事件與解謎來推進敘事。
  - 結合燈光視野限制、音效氛圍與理智值/驚嚇機制（視設計需求擴充）營造懸疑恐怖感。

---

## 2. 系統模組邊界 (Module Boundaries)
為確保專案可維護性與擴充性，程式碼將遵循高內聚、低耦合原則，劃分為以下核心模組：

1. **Core / Engine Layer (`src/core/`)**
   - 負責 Phaser `Game` 實例初始化、全域設定（解析度、物理引擎、渲染模式）、資源載入管理（Asset Loader）。
   - **邊界原則**：不直接包含具體劇情或特定關卡邏輯。
2. **Scenes Layer (`src/scenes/`)**
   - `BootScene` / `PreloadScene`：最小啟動資源與進度條載入。
   - `MainMenuScene`：標題畫面、開始/讀取遊戲、設定選項。
   - `GameScene`（或依區域拆分為 `CorridorScene`, `ClassroomScene` 等）：主探索場景，負責組合地圖、角色與互動點。
   - `UIScene`：以平行 Scene (`scene.launch`) 運行的 HUD、對話框、物品欄、過場遮罩，與主鏡頭縮放解耦。
3. **Entities & Controllers (`src/entities/`)**
   - `Player`：處理玩家橫向移動、奔跑/潛行、手電筒朝向、動畫狀態機（Idle, Walk, Run, Interact）。
   - `NPC` / `Hazard`：非玩家角色、巡邏黑影或恐怖事件實體。
   - `Interactable`：可互動物件基底類別（門、調查點、道具拾取點）。
4. **Narrative & Systems Layer (`src/systems/`)**
   - `DialogueSystem`：解析並播放結構化對話資料（JSON/YAML），支援打字機效果、立繪切換、分支選項與事件觸發。
   - `InventorySystem`：管理玩家持有的關鍵道具、線索筆記與使用邏輯。
   - `EventFlagSystem`（Story State）：集中管理遊戲進度旗標（Flags）、解謎狀態與觸發條件判斷。
   - `AudioSystem`：管理 BGM 淡入淡出、環境音（Ambience）與關鍵恐怖音效（SFX）播放。
   - `SaveSystem`：讀寫 `localStorage` 進行存檔與讀檔序列化。
5. **Data & Config Layer (`src/data/`)**
   - 存放純資料檔（對話腳本、道具定義、區域連線設定、事件表），使敘事內容與程式邏輯分離。

---

## 3. 建議目錄結構 (Directory Structure)
```text
retro-game-project4/
├── docs/
│   └── PROJECT_PLAN.md          # 專案架構與開發計畫書
├── public/
│   └── assets/                  # 靜態遊戲資源（不經 Vite 雜湊打包或供 Phaser Loader 直接讀取）
│       ├── audio/               # BGM、環境音、SFX
│       ├── fonts/               # 點陣或恐怖風格字型
│       ├── images/              # 背景圖、立繪、UI 素材、物件圖
│       ├── maps/                # Tiled 地圖 JSON 與 Tilesets
│       └── sprites/             # 角色與動態物件 Sprite Sheets
├── src/
│   ├── config/
│   │   └── gameConfig.ts        # Phaser.Types.Core.GameConfig 設定與常數
│   ├── core/
│   │   └── EventBus.ts          # 跨 Scene / UI 通訊事件匯流排
│   ├── data/
│   │   ├── dialogues/           # 對話劇本 JSON
│   │   └── items.ts             # 道具與線索資料定義
│   ├── entities/
│   │   ├── Player.ts            # 玩家角色控制與狀態
│   │   └── Interactable.ts      # 場景互動點元件
│   ├── scenes/
│   │   ├── BootScene.ts         # 啟動與預載場景
│   │   ├── MainMenuScene.ts     # 主選單場景
│   │   ├── GameScene.ts         # 2D 橫向探索主場景
│   │   └── UIScene.ts           # 對話框、物品欄、提示 UI 覆蓋層
│   ├── systems/
│   │   ├── DialogueManager.ts   # 對話流程控制器
│   │   ├── FlagManager.ts       # 劇情旗標與狀態管理
│   │   ├── InventoryManager.ts  # 物品與線索管理
│   │   └── SaveManager.ts       # 本地存讀檔管理
│   ├── types/
│   │   └── index.ts             # 全域 TypeScript 型別與介面定義
│   └── main.ts                  # 應用程式進入點
├── .gitignore
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

---

## 4. 開發順序與階段規劃 (Development Phases)

### Phase 0：專案盤點與開發前檢查（目前階段）
- 確認開發環境（Node.js, npm, Git, 瀏覽器）與遠端 GitHub 倉庫狀態。
- 制定 `docs/PROJECT_PLAN.md` 與架構規範。

### Phase 1：專案基底初始化與 Git 連接
- 初始化 Git 倉庫並設定遠端 `origin` (`https://github.com/s11311226-stack/retro-game-project4.git`)。
- 建立 Vite + TypeScript + Phaser 3 標準樣板（含 `package.json`, `tsconfig.json`, `vite.config.ts`, `.gitignore`）。
- 建立基礎 Scene 流轉（`BootScene` -> `MainMenuScene` -> `GameScene` + `UIScene`）。

### Phase 2：2D 側視移動與場景互動核心
- 實作 `Player` 左右橫向移動、邊界碰撞與攝影機跟隨（Camera Follow & Bounds）。
- 實作 `Interactable` 偵測機制（走近顯示提示圖示，按下互動鍵觸發事件）。
- 實作場景切換（例如：從「走廊」進入「教室」的門切換與淡入淡出過場）。

### Phase 3：敘事對話與狀態管理系統
- 實作 `EventBus` 與 `UIScene` 對話框渲染（打字機效果、角色名稱、選項分支）。
- 實作 `FlagManager` 與 `InventoryManager`，支援「取得鑰匙/線索後才可開啟特定門或觸發新對話」的核心解謎迴圈。

### Phase 4：恐怖氛圍、光影與音效整合
- 加入 Phaser 2D Lights / 視野遮罩（Vignette / 手電筒光束效果）營造陰暗校區氛圍。
- 整合 `AudioManager` 處理環境背景音、腳步聲與突發事件音效。
- 實作簡易存讀檔（`SaveManager`）與暫停選單。

### Phase 5：內容填入、除錯與封裝測試
- 串接完整第一章節/示範關卡的劇本、地圖與美術音訊素材。
- 執行 `npm run build` 驗證生產環境打包無型別與資源路徑錯誤。

---

## 5. 驗收標準 (Acceptance Criteria)
1. **建置與型別安全**：
   - 執行 `npx tsc --noEmit` 無任何 TypeScript 編譯錯誤。
   - 執行 `npm run build` 可成功產出 `dist/` 靜態部署檔案。
2. **核心玩法閉環**：
   - 玩家可在 2D 側視場景中流暢左右移動，攝影機正確跟隨且不超出地圖邊界。
   - 玩家靠近互動物件時有明確視覺提示，可觸發對話、拾取道具或切換房間。
   - 劇情旗標（Flags）與物品欄能正確影響後續互動結果。
3. **版本控制規範**：
   - `node_modules/`、`dist/`、`.env*` 等皆被 `.gitignore` 排除。
   - 每次階段性完成皆經確認後再進行清晰的 Git Commit。
