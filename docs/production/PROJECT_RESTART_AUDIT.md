# 《無名校區》(Nameless Campus) 正式版重新啟動 — Phase 6A 前置檢查報告

- **檢查日期**：2026-11-07
- **檢查階段**：Phase 6A 前置檢查（唯讀盤點與驗證，未修改任何核心遊戲程式碼）
- **目前實際工作區路徑**：`c:\Users\user\Desktop\Narrative Games`
  > **路徑差異提醒**：提示詞中提及 `E:\2D game`，但目前 IDE 綁定之有效工作區與 Git 倉庫位於 `c:\Users\user\Desktop\Narrative Games`（沙盒環境預設僅授權存取當前工作區，`E:\2D game` 位於工作區外）。若 `E:\2D game` 存有額外的 Phase 5 企劃文件，請告知是否需要跨磁碟讀取權限或直接於本工作區補齊。

---

## 一、專案目前狀態與完整目錄結構

### 1.1 專案目錄結構 (`c:\Users\user\Desktop\Narrative Games`)

```text
Narrative Games/
├── .gitignore
├── index.html
├── package.json
├── package-lock.json
├── README.md
├── tsconfig.json
├── vite.config.ts
├── docs/
│   ├── PROJECT_PLAN.md                        # Phase 0 專案開發計畫書
│   ├── MODULES_AND_TESTS.md                   # Phase 1~4 模組架構與測試報告
│   └── production/
│       └── PROJECT_RESTART_AUDIT.md           # 本次 Phase 6A 前置檢查報告
├── src/
│   ├── main.ts                                # 遊戲進入點
│   ├── config/
│   │   ├── gameConfig.ts                      # Phaser 3 全域設定 (640x360 邏輯解析度、整數倍縮放)
│   │   └── playerConfig.ts                    # 128x128 畫布基準、28x64 獨立碰撞箱、移動與攻擊時序設定
│   ├── core/
│   │   └── EventBus.ts                        # 跨場景與 UI 通訊事件匯流排
│   ├── data/
│   │   ├── campusAreas.ts                     # 四大探索區域、出入口、互動物件、文件與物品定義
│   │   └── storyScript.ts                     # 體驗版章節「點名簿上不存在的人」劇情事件與對白資料
│   ├── entities/
│   │   ├── PlayerController.ts                # 2D 側視移動、跳躍、重力、邊界、攻擊三階段與格擋狀態機
│   │   ├── PlaceholderCharacterRenderer.ts    # 128x128 測試占位角色渲染器 (實作 ICharacterVisualAdapter)
│   │   └── InteractablePlaceholderRenderer.ts # 場景互動物件占位渲染與滑鼠點選器 (實作 IInteractableVisualAdapter)
│   ├── scenes/
│   │   ├── BootScene.ts                       # 啟動引導場景
│   │   ├── MainMenuScene.ts                   # 主選單場景 (新遊戲、讀取存檔、BGM/SFX 音量設定)
│   │   ├── BaseExplorationScene.ts            # 探索區域共用場景基底類別
│   │   ├── SchoolGateScene.ts                 # 區域 1：校門
│   │   ├── BulletinAreaScene.ts               # 區域 2：中庭公告欄區域
│   │   ├── CorridorScene.ts                   # 區域 3：舊校舍一樓走廊
│   │   ├── ClassroomScene.ts                  # 區域 4：三年丙班教室
│   │   ├── GameScene.ts                       # Phase 1 向下相容走廊場景別名
│   │   └── UIScene.ts                         # 平行 UI 覆蓋層 (HUD、對話、調查、文件、背包、暫停選單、結算畫面)
│   ├── systems/
│   │   ├── InputManager.ts                    # 鍵盤與滑鼠輸入管理 (含視窗失焦防卡鍵機制)
│   │   ├── ExplorationStateManager.ts         # 區域切換、互動距離、單一視窗鎖定、背包與線索管理
│   │   ├── StoryStateManager.ts               # 劇情旗標、事件防重複觸發與正式版擴充介面 (IMultiEndingExtensionHooks)
│   │   ├── SaveManager.ts                     # Schema v2 版本化存讀檔、損毀檢查、V1 遷移與機密欄位防護
│   │   └── AudioSynthManager.ts               # Web Audio 原創循環 BGM、7 類音效與首次互動解鎖控制
│   └── types/
│       └── index.ts                           # 全域 TypeScript 型別與擴充介面定義
└── tests/
    ├── playerController.test.ts               # Phase 1 玩家控制與戰鬥單元測試 (7 項)
    ├── explorationSystem.test.ts              # Phase 2 四大區域與互動系統測試 (7 項)
    ├── storySystem.test.ts                    # Phase 3 體驗版劇情與防軟鎖測試 (4 項)
    └── saveAndAudioSystem.test.ts             # Phase 4 版本化存檔、舊版遷移與音訊系統測試 (5 項)
```

### 1.2 `package.json` 與開發環境狀態
- **Node.js / npm / Git**：Node.js `v24.20.0`、npm `11.19.0`、Git `2.44.0.windows.1`。
- **執行期依賴 (`dependencies`)**：`phaser` (`^3.87.0`)。
- **開發期依賴 (`devDependencies`)**：`typescript` (`^5.7.2`)、`vite` (`^6.0.3`)、`vitest` (`^2.1.8`)。
- **腳本指令**：`dev`、`build` (`tsc --noEmit && vite build`)、`preview`、`typecheck` (`tsc --noEmit`)、`test` (`vitest run`)。

---

## 二、Git 與 GitHub 同步狀態

- **目前分支**：`main`
- **工作目錄狀態**：檢查前為 `working tree clean`（無未提交修改、無衝突檔案）。
- **遠端倉庫 (`origin`)**：`https://github.com/s11311226-stack/retro-game-project4.git`
- **最新 Commit**：
  - `2237111` — `feat: complete Unnamed Campus demo (Phase 0-4: core movement, 4 campus areas, story, save & audio)`
- **同步狀態**：本地 `main` 分支與遠端 `origin/main` 完全同步 (`Your branch is up to date with 'origin/main'`)。

---

## 三、Demo 完整度評估 (Phase 1 ~ Phase 4)

現有 Demo（v0.4.0）功能完整度為 **100%**，所有模組職責清晰且已通過自動化測試：

1. **玩家移動與戰鬥核心 (`PlayerController` + `InputManager`)**：
   - 支援左右移動、朝向翻轉、跳躍、重力與地板碰撞、場景左右邊界阻擋。
   - 具備 `idle`、`move`、`jump`、`attack`（含 `startup` 90ms、`active` 120ms、`recovery` 140ms、`cooldown` 200ms）、`block` 五大明確狀態，互不卡死。
   - 角色採用 `128×128` 設計畫布基準，並配置獨立的 `28×64` 物理碰撞箱。
   - 視窗失焦 (`blur` / `visibilitychange`) 自動清空殘留按鍵與滑鼠輸入。
2. **四大校園探索區域與互動系統 (`ExplorationStateManager` + `BaseExplorationScene`)**：
   - 包含「校門」、「公告欄區域」、「校園走廊」、「三年丙班教室」四個獨立 Scene。
   - 實作校門/教室門、公告欄、課桌、黑板、入學通知、失蹤學生海報、神祕校務文件，以及 2 件可拾取入背包的物品（生鏽的三年丙班鑰匙、刻有校徽的黃銅名牌）。
   - 支援走近顯示 `[E]` 提示與滑鼠直接點選互動；強制單一主要互動鎖定；已拿取物品在同一存檔中絕不重複生成；文件重複閱讀絕不重複新增線索。
3. **體驗版短篇劇情與演出 (`StoryStateManager`)**：
   - 完整實作「點名簿上不存在的人」單一結局體驗版流程：開場入學演出 → 公告欄失蹤學生海報 → 持鑰匙進入教室 → 閱讀早於建校日期（1998 年 vs 2004 年）的校務文件 → 溫和視覺閃爍與「新生已完成觀察」神祕訊息演出 → 通關結算與重新開始。
   - 支援非線性調查順序防軟鎖（先讀文件或先讀海報皆可正常觸發結尾）。
4. **存讀檔與音訊系統 (`SaveManager` + `AudioSynthManager`)**：
   - 實作主選單、暫停選單手動存讀檔、過場自動存檔、BGM/SFX 獨立音量控制與靜音切換。
   - 涵蓋腳步、跳躍、攻擊、格擋、互動/拾取、開門、神祕訊息共 7 類原創合成音效與循環 BGM，並嚴格遵守瀏覽器首次互動後才解鎖音訊的規範。

---

## 四、現有存檔格式及相容性分析

- **儲存鍵名**：`localStorage['unnamed_campus_save_v2']`（音訊設定儲存於 `unnamed_campus_audio_settings_v1`）。
- **目前結構版本**：`SAVE_SCHEMA_VERSION = 2` (`GameSavePayloadV2`)。
- **儲存內容**：
  - `player`：`areaId`, `spawnId`, `x`, `y`, `facing`
  - `exploration`：`collectedObjectIds`, `inventoryItemIds`, `clueIds`, `unlockedPortalIds`
  - `story`：`flags`, `completedEventIds`, `currentObjectiveText`, `metrics` (`evidenceCompleteness`, `affectionScores`, `conglomerateAlertLevel`)
  - `audio`：`bgmVolume`, `sfxVolume`, `muted`
- **相容性與防護機制**：
  - 已內建 JSON 損毀攔截、必要欄位型別驗證、`v1 -> v2` 舊版存檔自動遷移，以及禁止寫入密碼/Token 等機密欄位的檢查。
  - **正式版擴充相容建議**：由於 `SaveManager` 目前使用白名單集合（`VALID_AREA_IDS`、`VALID_STORY_FLAGS`、`VALID_STORY_EVENTS`）過濾欄位，未來在 Phase 6A 新增正式版地圖、新章節旗標、多存檔槽位或角色成長數值時，應採用**動態註冊白名單或升級至 `schemaVersion: 3` 並提供 `migrateV2ToV3()`**，即可 100% 向下相容現有 Demo V2 存檔。

---

## 五、Phase 5 文件完整度檢查 (`docs/production/`)

- **現有文件**：
  - `docs/PROJECT_PLAN.md`（Phase 0 基礎架構計畫）
  - `docs/MODULES_AND_TESTS.md`（Phase 1~4 模組與測試報告）
- **`docs/production/` 狀態**：
  - 在本次檢查前，本工作區 (`c:\Users\user\Desktop\Narrative Games`) 尚未建立 `docs/production/` 子目錄與 Phase 5 正式版企劃文件（開發流程直接由 Phase 4 跳至 Phase 6A 前置檢查）。
  - 若您在 `E:\2D game\docs\production\` 存有 Phase 5 正式版企劃文件，請確認是否需要將其複製或同步至本工作區；若尚未建立，我們可在進入 Phase 6A 實作前先於 `docs/production/` 建立正式版規格書（包含完整章節大綱、地圖拓樸、NPC 與敵人/威脅機制、多結局分歧條件表、移动端打包規劃）。

---

## 六、驗證與測試結果 (Verification Results)

本次前置檢查實際執行了以下三項驗證，**全部通過且零錯誤**：

1. **TypeScript 型別檢查 (`npm run typecheck`)**：
   - 執行 `tsc --noEmit`：**PASS (0 errors)**。
2. **Vitest 自動化測試 (`npm test`)**：
   - `tests/playerController.test.ts`：7 passed
   - `tests/explorationSystem.test.ts`：7 passed
   - `tests/storySystem.test.ts`：4 passed
   - `tests/saveAndAudioSystem.test.ts`：5 passed
   - **總計：4 個測試套件、23 項測試全數通過 (`23 passed`)**。
3. **Vite Production Build (`npm run build`)**：
   - 成功轉換 31 個模組並產出 `dist/index.html` 與 `dist/assets/index-D1X1-s4s.js`：**PASS (Exit Code 0)**。

---

## 七、發現的問題與潛在注意事項

1. **工作區路徑不一致 (`c:\Users\user\Desktop\Narrative Games` vs `E:\2D game`)**：
   - 目前 Git 遠端倉庫與 Phase 0~4 完整程式碼皆位於 `c:\Users\user\Desktop\Narrative Games`。需與使用者確認後續開發是以當前工作區為主，或需遷移/讀取 `E:\2D game`。
2. **缺少 Phase 5 `docs/production/` 正式版規格文件**：
   - 除了本次產出的 `docs/production/PROJECT_RESTART_AUDIT.md` 外，尚無其他 Phase 5 企劃文件存在於 `docs/production/` 中。
3. **Vite 打包單一 Chunk 大小提醒**：
   - `phaser` 引擎核心打包後約 `1.57 MB`（gzip 後約 `367 KB`），Vite 顯示 `> 500 kB` 提示。在正式版可透過 `vite.config.ts` 的 `manualChunks` 將 `phaser` 獨立拆分為 vendor chunk 以優化快取與載入速度。
4. **行動裝置 (Android / iOS) 預留支援**：
   - 目前 `InputManager` 支援鍵盤與滑鼠點擊互動物件，但若未來要封裝至 Android / iOS，需預留虛擬方向鍵／觸控按鈕層 (Virtual Touch Controls Overlay) 的輸入介面。

---

## 八、正式版待開發功能與 Phase 6A 開發建議

### 8.1 正式版待開發核心系統
1. **完整世界觀與多章節地圖擴充**：擴充地下檔案室、保健室、教務處、頂樓等正式版校園區域與地圖切換。
2. **NPC 互動、對話分支與好感度系統**：啟用 `StoryStateManager` 預留的 `affectionScores`，加入多選一對話選項與 NPC 支線。
3. **證據完整度與財閥警戒度機制**：啟用 `evidenceCompleteness` 與 `conglomerateAlertLevel`，影響校園巡邏威脅、理智值/壓迫感演出及可進入的隱藏區域。
4. **威脅 / 敵人與潛行或戰鬥受擊回饋**：運用 Phase 1 已完成的攻擊判定框 (`getActiveAttackHitbox`) 與格擋狀態 (`block`)，加入可互動的校園怪異實體、生命/理智值與格擋減傷判定。
5. **多結局判定與多重存檔槽位**：實作 `resolveEndingRouteId()` 的正式版多結局分支（True / Normal / Bad Endings），並擴充 `SaveManager` 支援多存檔槽位。
6. **128×128 正式像素美術與跨平台觸控預留**：透過 `ICharacterVisualAdapter` 與 `IInteractableVisualAdapter` 載入正式 SpriteSheet 與地圖素材，並為行動端預留虛擬按鍵。

### 8.2 Phase 6A 建議優先開發項目
- **Step 1**：確認或補齊 `docs/production/` 正式版核心資料表與章節架構定義。
- **Step 2**：在不改動現有 Demo 四大區域與單一結局流程的前提下，擴充資料結構以支援「多重存檔槽位 (Slot 1~3) + V2 相容讀取」及「多選一分支對話系統」。
- **Step 3**：實作玩家生命值／理智值 (HP / Sanity) 與格擋受擊回饋模組，並補齊對應的 Vitest 單元測試。

---

## 九、可能影響舊功能的風險與防範對策

| 風險項目 | 可能影響的既有 Demo 功能 | 防範對策 |
| :--- | :--- | :--- |
| **擴充 `SaveManager` 白名單或結構** | 若直接修改 V2 結構而未向下相容，舊存檔可能被判定為 `invalid_schema` | 保持 `VALID_AREA_IDS` 與 `VALID_STORY_FLAGS` 動態從資料表匯入，若新增欄位則提供預設值 fallback 或升級遷移函式 |
| **擴充 `StoryStateManager` 多結局邏輯** | 可能改變 Demo 章節「點名簿上不存在的人」原本單一結局的觸發條件 | 保留 `evt_anomaly_new_student_observed` 與 Demo 旗標邏輯不變，正式版後續章節使用獨立的章節 ID 與事件表 |
| **新增戰鬥受擊或敵人實體** | 可能干擾 Phase 1 已驗收的 `PlayerController` 移動、跳躍與攻擊時序 | 遵循開放封閉原則（OCP），不重寫 `PlayerController.step()` 核心物理，透過外部戰鬥管理模組處理碰撞與傷害結算 |
| **新增行動端觸控 UI 或新面板** | 可能與 `UIScene` 現有的單一視窗鎖定 (`UIModalState`) 產生衝突 | 所有新 UI 狀態統一納入 `UIModalState` 狀態機控管，並維持既有 23 項自動化測試作為回歸防線 |
