# 《無名校區》(Nameless Campus) — 正式版遊戲系統與技術規格 (GAMEPLAY SYSTEMS)

- **文件版本**：v1.0 (Production Phase 5)
- **技術棧**：Phaser 3 + TypeScript (Strict Mode) + Vite + Vitest
- **架構原則**：高內聚、低耦合，100% 向下相容現有 Demo (Phase 1～4) 模組與 23 項既有測試。

---

## 一、八大核心全域遊戲變數 (Core Global Variables)

正式版於狀態管理層統一維護以下 8 項核心數值變數，並納入版本化存檔與 `EndingEvaluator` 評估：

| 變數名稱 | 型別與範圍 | 預設值 | 數值意義與系統連動說明 |
| :--- | :--- | :---: | :--- |
| **`evidenceCompletion`** | `number` (`0`～`100`) | `0` | **證據完整度**：代表對 1954～1999 白川財閥實驗、第29號席位與回聲搖籃計畫的真相掌握百分比。閱讀關鍵文件、識破錯誤線索、解碼蘇語嵐錄音時提升。 |
| **`injuryCount`** | `number` (`0`～`99`) | `0` | **累積重傷次數**：主角在夜間潛行或地下室戰鬥中遭受重擊或失敗的累積次數。葉思涵支線可進行醫療減免；過高（`>= 5`）易導向 **B 結局（血色校園）**。 |
| **`studentAffinity`** | `number` (`0`～`100`) | `20` | **學生好感度**：全校核心同學對蘇語晴的情感認同與友誼平均值。透過日常互助與個人支線提升，為 **C 結局** 動員基礎。 |
| **`studentTrust`** | `number` (`0`～`100`) | `10` | **學生信任度**：師生群體對「第29號席位與地下實驗」真相的理性採信程度。透過出示確鑿物證與救出林曉月提升；誤信錯誤線索則扣減。 |
| **`corporateAlert`** | `number` (`0`～`100`) | `0` | **財閥警戒度**：白川鎮雄（保守派）與沈知遠對主角調查行動的警覺程度。夜間被巡邏發現、強行破門或誤觸陷阱時上升；白川颯支線可協助降低。 |
| **`experimentCorruption`** | `number` (`0`～`100`) | `0` | **實驗侵蝕度（認知污染值）**：主角受 `18.9Hz` 第四聲鐘響、保健室鎮靜藥物與 B3 雙子共鳴侵蝕的程度。過高（`>= 80`）將導向 **D 結局（無名者）**，處於 `70～79` 且高證據則可解鎖 **E 結局（觀察者）**。 |
| **`publicExposure`** | `number` (`0`～`100`) | `0` | **外界曝光度**：校園黑幕傳遞至校外媒體、檢調單位與失蹤學生家長群的程度。透過陳品妍暗房沖洗、公告欄大字報與頂樓短波電台提升。 |
| **`academicCredits`** | `number` (`0`～`100`) | `60` | **學業學分與校規評價**：主角在日間課堂的出席與學業表現。由 `AcademicSystem` 管理；若低於 `30` 將觸發沈知遠的「強制留校輔導」，削減夜間探索時間。 |

---

## 二、十一大正式版遊戲系統規格 (11 Core Gameplay Systems)

---

### 1. `CharacterRelationshipSystem`（角色關係與派系系統）
- **職責**：管理 15 位核心角色的個別好感度 (`affinity: 0~100`)、個別信任度 (`trust: 0~100`)、關係階段（Tier 1～3）及支線任務解鎖狀態，並動態加權計算全域 `studentAffinity` 與 `studentTrust`。
- **核心介面**：
  - `getCharacterRelation(charId: string): { affinity: number; trust: number; tier: 1 | 2 | 3 }`
  - `modifyAffinity(charId: string, delta: number, reason?: string): void`
  - `modifyTrust(charId: string, delta: number, evidenceId?: string): void`
  - `getAggregateStudentMetrics(): { studentAffinity: number; studentTrust: number }`

---

### 2. `EvidenceSystem`（證據鏈、文件與錯誤線索識破系統）
- **職責**：管理所有文件 (`DocumentDef`)、實體物證、蘇語嵐錄音日誌與錯誤線索 (`RedHerringDef`)。
- **核心機制**：
  - **防重複計分**：文件可無限次重讀，但每項證據對 `evidenceCompletion` 的貢獻只計算一次。
  - **證據交叉比對（Contradiction Check）**：玩家可將兩項線索（例如「2004 年建校碑文」與「1998 年校務文件」，或「林曉月左手素描」與「偽造右手情書」）進行比對，識破錯誤線索並獲得額外 `evidenceCompletion` 與 `studentTrust`。

---

### 3. `QuestSystem`（主線、角色支線與日夜任務系統）
- **職責**：追蹤四大章節主線進度與 10 條角色專屬支線任務（狀態：`locked` → `available` → `active` → `completed` / `failed`）。
- **核心機制**：
  - 支援多步驟目標提示（自動同步至 `UIScene` 頂部目標列）。
  - 任務觸發條件完全基於**穩定事件 ID 與旗標**，不依賴脆弱的場景 X/Y 座標。

---

### 4. `AcademicSystem`（日間學業學分與校規系統）
- **職責**：管理主角在日間時段的課堂問答（如許文謙老師的歷史課隱喻問題）、出缺席與校規紀錄，維護 `academicCredits`。
- **核心機制**：
  - `academicCredits >= 75`：獲得模範生權限，可合法進出「教師辦公室」與「舊圖書館特藏區」而不增加 `corporateAlert`。
  - `academicCredits < 30`：遭到教務主任沈知遠記過處分，扣除當晚可探索行動點數並增加 `+10 corporateAlert`。

---

### 5. `StealthSystem`（夜間與地底潛行系統）
- **職責**：在夜間走廊、教務處與地下 B1～B2 提供「視野錐偵測（Vision Cone）」、「腳步聲噪音半徑（Noise Radius）」與「掩體躲藏（Hiding Spot，如講台下、儲物櫃、隔簾後）」機制。
- **核心機制**：
  - 玩家可切換手電筒開關與蹲伏慢走（利用 `PlayerController` 既有移動參數擴充）。
  - 被巡邏守衛發現時會提升 `corporateAlert` 並進入追逐狀態；若成功躲入掩體直至警戒歸零則安全脫身。

---

### 6. `Enemy AI`（巡邏守衛與失控實驗體 AI 系統）
- **職責**：為夜間巡邏人員（沈知遠、財閥保安）與地下 B1～B2 威脅（陳孟哲、受 `18.9Hz` 影響的失控實驗體）提供輕量、明確的有限狀態機（FSM）。
- **AI 狀態機**：
  1. `patrol`：於設定路徑點間往返巡邏。
  2. `suspicious`：聽見聲響或手電筒光線掃過，朝音源移動調查。
  3. `chase`：目視發現主角，高速追擊。
  4. `attack`：進入攻擊距離，發動抓取或揮擊（具備明確前搖提示供玩家格擋或閃避）。
  5. `stunned`：遭玩家有效攻擊判定框（`Active Hitbox`）或逆相音叉擊中時短暫硬直。

---

### 7. `CombatSystem`（2D 側視防身戰鬥與受擊格擋系統）
- **職責**：直接建立在 **Phase 1 已驗收通過的 `PlayerController`** 基礎上（不重寫 `PlayerController`），負責處理玩家攻擊判定框 (`getActiveAttackHitbox()`) 與敵人碰撞箱的交集結算、生命值／耐力值，以及格擋減傷。
- **核心機制**：
  - **攻擊有效判定**：當玩家處於 `attack: active` 階段且命中敵人時，造成傷害與擊退硬直。
  - **精準格擋（Block & Parry）**：當玩家處於 `block` 狀態時正面承受敵人攻擊，可免除重傷並彈開敵人；若未格擋而受擊達上限，則 `injuryCount += 1` 並由同伴掩護撤回安全點。

---

### 8. `SaveManager` 擴充（多重存檔槽位與 V2/V3 向下相容）
- **職責**：在現有 Phase 4 `SaveManager` (`schemaVersion: 2`) 的基礎上，擴充支援正式版 8 大核心變數、角色關係表、任務進度與 **3 個獨立存檔槽位（Slot 1～3）+ 1 個自動存檔槽位（AutoSave）**。
- **向下相容保證**：
  - 完整保留 `loadAndValidateSave()` 對現有 Demo `SAVE_SCHEMA_VERSION = 2`（以及 `v1 -> v2`）的讀取與驗證能力，確保現有 `tests/saveAndAudioSystem.test.ts` 的 5 項測試 100% 原封不動通過。
  - 新增欄位皆具備安全預設值 fallback，並持續執行 `assertNoSecretFields()` 阻擋任何機密寫入。

---

### 9. `EndingEvaluator`（五種結局條件評估器）
- **職責**：根據 `ENDING_DESIGN.md` 定義的優先序與條件公式，綜合評估 8 大核心變數與關鍵劇情旗標，決定進入 **A（真相大白）、B（血色校園）、C（群體反抗／12區域依序攻佔）、D（無名者）、E（觀察者）** 或 **Demo 單一結局**。
- **核心介面**：
  - `evaluateFormalEnding(state): 'ending_a' | 'ending_b' | 'ending_c' | 'ending_d' | 'ending_e'`
  - `getEndingProgressReport(state)`: 回傳各結局目前達成度百分比與尚缺條件（供測試與除錯驗證）。

---

### 10. `AudioManager`（日夜雙軌、18.9Hz 共振與多層音訊管理）
- **職責**：擴充現有 `AudioSynthManager`，支援 14 個區域的環境音切換、日夜 BGM 轉換、第四聲鐘響的心理聲學次聲波轉譯（以安全可聽見的 `56.7Hz / 113.4Hz` 泛音拍頻模擬 `18.9Hz` 壓迫感），以及潛行心跳聲與戰鬥音效。
- **合規保證**：嚴格維持「使用者首次點擊或按鍵後才解鎖 Web Audio」的機制。

---

### 11. 場景管理與事件管理（`SceneTransitionManager` & `EventDirector`）
- **職責**：
  - 統一管理 14 個探索區域的載入、安全出生點定位（杜絕卡牆與懸空）、日夜光影濾鏡切換。
  - 支援 **C 結局（群體反抗）** 專屬的「12 區域連續推進狀態機」（`校門 → 公告欄 → 走廊 → 教室 → 教師辦公室 → 宿舍 → 舊圖書館 → 頂樓 → 保健室 → 地下 B1 → B2 → B3`），確保每一站攻佔演出與敵我位置無縫銜接。
