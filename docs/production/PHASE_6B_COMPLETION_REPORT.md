# 《無名校區》(Nameless Campus) — Phase 6B 完成報告

**階段名稱**：Phase 6B — 正式版校園探索、NPC 與清晰字體系統  
**專案路徑**：`C:\Users\user\Desktop\Narrative Games`  
**完成日期**：2026-11-08  

---

## 一、Phase 6B 完成項目總覽

本階段將《無名校區》從體驗版與核心底層架構（Phase 0–6A）正式擴充為具備 **11 處可探索校園場景**、**10 位校內常駐／事件 NPC 分支對話**、**日／黃昏（18.9Hz 第四聲鐘響）／夜三時段氛圍系統**，以及 **高清晰繁體中文字體與四分頁正式版調查 UI** 的可遊玩版本，同時 100% 保留原有 Demo 的全部流程與向下相容性。

1. **開發前檢查與 Git 安全保護點**：
   - 完整檢閱 `docs/production/` 下全部 12 份正式版企劃文件與既有系統架構。
   - 於進入 Phase 6B 實作前建立本地 Git Checkpoint（Commit `ab14574`），確保隨時可安全回滾且未執行任何未授權之遠端推送。
2. **正式版清晰繁體中文字體與 UI 規範系統（最高優先）**：
   - 新增 [`public/fonts/noto-sans-tc.css`](file:///c:/Users/user/Desktop/Narrative%20Games/public/fonts/noto-sans-tc.css)、更新 [`index.html`](file:///c:/Users/user/Desktop/Narrative%20Games/index.html)，並建立 [`TypographyConfig.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/config/TypographyConfig.ts) 與 [`FontManager.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/systems/FontManager.ts)。
   - 解決 Phaser `pixelArt: true` 導致 Canvas 中文字體低解析度鋸齒與筆畫黏連問題：所有文字統一透過 `globalFontManager.createCrispText()` 以 `resolution: 3` 超取樣渲染，並對文字貼圖設定線性過濾（`setFilter(0)`），確保繁體中文清晰銳利。
   - 嚴格落實 640×360 邏輯解析度字級規範：
     - 主標題 (`mainTitle` / `menuTitle`)：**26px** (`Noto Sans TC Bold`)
     - 角色名稱 (`speakerName`)：**17px**（符合 16–18px 規範）
     - 主要對話文字 (`dialogueBody`)：**16px**（符合 16–18px 規範）
     - 選單文字 (`menuItem`)：**15px**（符合 14–16px 規範）
     - 文件內容 (`documentBody`)：**14px**（符合 14–16px 規範）
     - 重要提示 (`importantPrompt`)：**16px**（符合 >= 16px 規範）
     - 次要提示 (`secondaryHint`)：**12px**（符合 >= 12px 規範，全專案無小於 12px 之模糊小字）
   - 實作 `paginateDocumentContent()` 長文自動分頁與滾輪／鍵盤 (`W`/`S`/`↑`/`↓`) 翻頁機制，杜絕長篇機密檔案超出閱讀視窗。
3. **第一批正式版 7 個新增校園探索場景（全校共 11 處地面場景）**：
   - 於 [`campusAreas.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/data/campusAreas.ts) 與 [`CampusAreaScenes.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/scenes/CampusAreaScenes.ts) 實作 7 個全新橫向探索場景，並與既有 4 個場景（校門、公告欄、走廊、三年丙班教室）雙向連通：
     1. **教務處 (`academic_office` / `AcademicOfficeScene`)**：雙重密碼保險箱（《1954～1999 空白學籍註銷黑皮書》）、學分管理終端機、教務主任沈知遠。
     2. **教師辦公室 (`teachers_office` / `TeachersOfficeScene`)**：1994 年偽造退學申請書（錯誤線索 Red Herring）、未塗改的一月原始點名簿、導師許文謙。
     3. **學生宿舍 (`dormitory` / `DormitoryScene`)**：304 室床鋪（可休息並切換日／黃昏／夜時段）、蘇語嵐雙層床暗格（《蘇語嵐的微型錄音帶》）、29 號儲物櫃（《刻有失蹤玩伴名字的田徑接力棒》）、室友葉思涵。
     4. **舊圖書館 (`old_library` / `OldLibraryScene`)**：微縮膠卷閱讀機（《1979 年白川腦科學臨床中心地契與藍圖》）、古籍借閱台、特藏書櫃暗門（需林靜儀授予《禁書室特藏銅鑰匙》解鎖）、圖書館管理員林靜儀。
     5. **禁書室 (`forbidden_archive` / `ForbiddenArchiveScene`)**：《1968 年 18.9Hz 次聲波共鳴實驗報告》、歷屆第 29 號失蹤者名單牆、林曉月留下的地下結構炭筆素描、蘇語嵐腦波共鳴殘響。
     6. **頂樓與鐘塔 (`rooftop` / `RooftopScene`)**：鐘塔低頻擴音號角陣列（《鐘塔第四聲鐘響 18.9Hz 調變波形紀錄》）、物理社社長陸子軒、白川颯。
     7. **保健室 (`infirmary` / `InfirmaryScene`)**：上鎖藥品櫃（《白川鏡花零號病歷與記憶清洗處方》）、《保健室通往 B1 實驗檢體移交簽收單》、地下 B1 貨梯暗門（通往後續 Phase 6C 地下區域）、駐校校醫陳孟哲。
4. **NPC 角色配置與分支對話系統 (`NPCInteractionSystem`)**：
   - 於 [`npcDialoguesCatalog.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/data/npcDialoguesCatalog.ts) 與 [`NPCInteractionSystem.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/systems/NPCInteractionSystem.ts) 實作 10 處校園角色互動點，涵蓋陳品妍、趙家豪、周予安、沈知遠、許文謙、葉思涵、林靜儀、蘇語嵐殘響、陸子軒、白川颯、陳孟哲。
   - 支援滑鼠點擊與數字鍵 (`[1]`–`[3]`、`[0]`) 分支選擇、持有特定證據解鎖隱藏對質選項（顯示 `🔍` 標記）、識破錯誤線索（Red Herring）、好感度 (`affinity`) 與信任度 (`trust`) 即時增減、角色覺醒判定，以及單次對話事件防重複保護。
5. **探索調查視覺回饋與日／黃昏／夜氛圍系統 (`CampusAtmosphereSystem`)**：
   - 於 [`InteractablePlaceholderRenderer.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/entities/InteractablePlaceholderRenderer.ts) 繪製 128×128 基準角色外觀配色立繪占位與各式新增互動物件（保險箱、書櫃、床鋪、藥品櫃、鐘塔擴音器、微縮膠卷機），並對已調查物件顯示 `✓` 視覺標記。
   - 於 [`CampusAtmosphereSystem.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/systems/CampusAtmosphereSystem.ts) 與 [`AudioSynthManager.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/systems/AudioSynthManager.ts) 實作日間 (`day`)、黃昏 18.9Hz 第四聲鐘響 (`dusk`) 與夜間 (`night`) 切換；未持有《18.9Hz 逆向抗頻八音盒／音叉》時進入黃昏會受到低頻共振影響，持有後則自動發射反相聲波抵消侵蝕。

---

## 二、新增與修改檔案清單

### 新增檔案
- [`public/fonts/noto-sans-tc.css`](file:///c:/Users/user/Desktop/Narrative%20Games/public/fonts/noto-sans-tc.css)：繁體中文 `Noto Sans TC` / `Noto Sans CJK TC` 字體宣告與清晰抗鋸齒設定。
- [`src/config/TypographyConfig.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/config/TypographyConfig.ts)：640×360 邏輯解析度字級規範（12px–26px）與超取樣倍率設定。
- [`src/systems/FontManager.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/systems/FontManager.ts)：清晰文字建立器、線性貼圖過濾器、字級標準驗證與長文分頁器。
- [`src/data/npcDialoguesCatalog.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/data/npcDialoguesCatalog.ts)：全校區 10 處 NPC 駐留設定、角色專屬配色與條件分支對話資料。
- [`src/systems/NPCInteractionSystem.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/systems/NPCInteractionSystem.ts)：NPC 對話狀態機、證據解鎖判定、關係／任務／證據連動與單次防重複系統。
- [`src/systems/CampusAtmosphereSystem.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/systems/CampusAtmosphereSystem.ts)：日間、黃昏（18.9Hz 第四聲鐘響）與夜間時段氛圍與侵蝕抵消系統。
- [`src/scenes/CampusAreaScenes.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/scenes/CampusAreaScenes.ts)：7 個新增校園探索場景類別（`AcademicOfficeScene`、`TeachersOfficeScene`、`DormitoryScene`、`OldLibraryScene`、`ForbiddenArchiveScene`、`RooftopScene`、`InfirmaryScene`）。
- [`tests/phase6bExplorationNpcAndFont.test.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/tests/phase6bExplorationNpcAndFont.test.ts)：Phase 6B 完整單元與整合測試。
- [`docs/production/PHASE_6B_COMPLETION_REPORT.md`](file:///c:/Users/user/Desktop/Narrative%20Games/docs/production/PHASE_6B_COMPLETION_REPORT.md)：本完成報告。

### 修改檔案
- [`index.html`](file:///c:/Users/user/Desktop/Narrative%20Games/index.html)：引入 `Noto Sans TC` 样式表與繁體中文渲染設定。
- [`src/types/index.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/types/index.ts)：擴充 11 個 `AreaId`、`'npc'` 互動類型、新視覺樣式、`CampusTimePhase` 與 NPC 對話結構。
- [`src/core/EventBus.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/core/EventBus.ts)：新增 NPC 對話、分支選擇与日夜時段切換事件。
- [`src/data/campusAreas.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/data/campusAreas.ts)：擴充走廊樞紐出入口並新增 7 大校園探索場景與互動物件。
- [`src/data/evidenceCatalog.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/data/evidenceCatalog.ts) & [`src/data/questsCatalog.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/data/questsCatalog.ts)：新增各處室關鍵物證與角色支線任務。
- [`src/systems/ExplorationStateManager.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/systems/ExplorationStateManager.ts)：新增 NPC 互動分派、`grantItem` 與已調查物件追蹤。
- [`src/systems/SaveManager.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/systems/SaveManager.ts)：支援全部 11 個場景存讀檔，並保存時段、NPC 已完成對話選項與已調查物件狀態。
- [`src/systems/AudioSynthManager.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/systems/AudioSynthManager.ts)：新增 18.9Hz 第四聲鐘響與逆相八音盒音效合成。
- [`src/entities/InteractablePlaceholderRenderer.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/entities/InteractablePlaceholderRenderer.ts)：全面改用清晰字體（>=12px）、新增 128×128 角色占位與各處室物件渲染及 `✓` 已調查標記。
- [`src/scenes/BaseExplorationScene.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/scenes/BaseExplorationScene.ts)、[`src/scenes/MainMenuScene.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/scenes/MainMenuScene.ts)、[`src/scenes/UIScene.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/scenes/UIScene.ts)、[`src/config/gameConfig.ts`](file:///c:/Users/user/Desktop/Narrative%20Games/src/config/gameConfig.ts)：整合 11 個場景、清晰字體、NPC 分支對話 UI、文件分頁器與四分頁正式版調查中心。

---

## 三、測試結果與驗證數據

1. **TypeScript 嚴格型別檢查 (`npm run typecheck`)**：
   - 執行 `tsc --noEmit`，**0 錯誤 (0 errors)**。
2. **Vitest 自動化單元與整合測試 (`npm test`)**：
   - 共 **10 個測試檔案、46 項測試案例全部通過 (46 passed / 0 failed)**：
     - `tests/playerController.test.ts` (7 passed)
     - `tests/explorationSystem.test.ts` (7 passed)
     - `tests/storySystem.test.ts` (4 passed)
     - `tests/saveAndAudioSystem.test.ts` (5 passed)
     - `tests/globalGameState.test.ts` (4 passed)
     - `tests/characterRelationshipSystem.test.ts` (4 passed)
     - `tests/evidenceSystem.test.ts` (4 passed)
     - `tests/questSystem.test.ts` (4 passed)
     - `tests/phase6aSaveMigration.test.ts` (2 passed)
     - `tests/phase6bExplorationNpcAndFont.test.ts` (5 passed)
3. **正式版生產環境建置 (`npm run build`)**：
   - `tsc --noEmit && vite build` 成功產出 `dist/` 靜態資源，無任何編譯或打包錯誤。

---

## 四、Phase 6C 建議開發事項

1. **第二批校園與地下研究設施場景擴充（Phase 6C）**：
   - 由保健室後方「地下 B1 貨梯暗門 (`obj_infirmary_b1_elevator_door`)」與舊圖書館禁書室向下延伸，建立 **地下一層歷史與記憶封存庫 (`b1_archive`)**、**地下二層神經聲學與雙子實驗區 (`b2_lab`)** 與 **地下三層「回聲搖籃」核心中樞 (`b3_echo_cradle`)**。
2. **第二章～第四章主線劇情推進與多結局決戰事件**：
   - 串聯白川鏡花（零號實驗體）、白川鎮雄（最終反派）與雙胞胎姊姊蘇語嵐的意識救援戰，並實作五大正式結局（Ending A–E）的完整演出。
