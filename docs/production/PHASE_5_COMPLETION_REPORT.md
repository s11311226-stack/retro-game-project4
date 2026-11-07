# 《無名校區》(Nameless Campus) — Phase 5 世界觀與完整企劃重建完成報告

- **報告日期**：2026-11-07
- **專案工作區**：`C:\Users\user\Desktop\Narrative Games`
- **當前階段**：Phase 5 — 世界觀與完整企劃重建（僅建立 `docs/production/` 企劃文件，未破壞或改寫任何既有 Demo 程式碼與測試）

---

## 一、十份正式版企劃文件完整度清單

已在 `C:\Users\user\Desktop\Narrative Games\docs\production\` 目錄下完整建立以下 10 份正式版核心企劃文件（連同前置檢查與本報告共 12 份文件）：

| 編號 | 文件檔案名稱 | 完成狀態 | 核心涵蓋內容摘要 |
| :---: | :--- | :---: | :--- |
| 01 | [`WORLD_BIBLE.md`](./WORLD_BIBLE.md) | ✅ 100% | 白川財閥（1954～1999 年完整年表）、第29號席位、認知過濾機制、18.9Hz 第四聲鐘響、B1～B3 地下實驗室、回聲搖籃計畫、三大派系（保守掩蓋派／激進研究派／內部改革派）與專有名詞辭典。 |
| 02 | [`MAIN_STORY.md`](./MAIN_STORY.md) | ✅ 100% | 日夜雙軌制規則、四大章節（第一章《第29張課桌》、第二章《被塗改的校史與雙面人》、第三章《地底的回聲搖籃》、第四章《第四聲鐘響之後》）主線、支線、錯誤線索（Red Herrings）、關鍵抉擇與轉折。 |
| 03 | [`CHARACTER_DATABASE.md`](./CHARACTER_DATABASE.md) | ✅ 100% | 主角蘇語晴、姊姊蘇語嵐，以及林曉月、周予安、陳品妍、趙家豪、白川颯、葉思涵、陸子軒、沈知遠、許文謙、陳孟哲、白川鎮雄、白川鏡花、林靜儀共 15 位角色的完整背景、128×128 外貌服裝、性格、秘密、支線、好感/信任影響與結局定位。 |
| 04 | [`CHARACTER_RELATIONSHIPS.md`](./CHARACTER_RELATIONSHIPS.md) | ✅ 100% | 15 人關係拓樸圖、三大派系對立矩陣、`studentAffinity`（好感度）與 `studentTrust`（信任度）雙軸設計、三階段關係門檻與跨角色衝突事件。 |
| 05 | [`ART_DIRECTION.md`](./ART_DIRECTION.md) | ✅ 100% | `640×360` 邏輯解析度、`128×128` 角色畫布基準對 `28×64` 獨立碰撞箱規範、14 區域調色盤、角色 6 大動作幀數規格、防光敏感閃爍規範與行動端觸控 UI 預留。 |
| 06 | [`WORLD_MAP.md`](./WORLD_MAP.md) | ✅ 100% | 校門、公告欄、走廊、教室、教務處、教師辦公室、宿舍、舊圖書館、禁書室、頂樓、保健室、地下 B1、地下 B2、地下 B3 共 14 個區域的尺寸邊界、NPC、線索、任務、事件與連接拓樸圖。 |
| 07 | [`GAMEPLAY_SYSTEMS.md`](./GAMEPLAY_SYSTEMS.md) | ✅ 100% | 11 大正式版系統（`CharacterRelationshipSystem`、`EvidenceSystem`、`QuestSystem`、`AcademicSystem`、`StealthSystem`、`Enemy AI`、`CombatSystem`、`SaveManager 擴充`、`EndingEvaluator`、`AudioManager`、`場景與事件管理`）與 8 大全域變數技術規格。 |
| 08 | [`ENDING_DESIGN.md`](./ENDING_DESIGN.md) | ✅ 100% | A（真相大白）、B（血色校園）、C（群體反抗／攻佔結局，含 12 區域嚴格攻佔順序）、D（無名者）、E（觀察者・隱藏結局）的觸發公式、判定優先序與完整演出分鏡。 |
| 09 | [`AUDIO_DESIGN.md`](./AUDIO_DESIGN.md) | ✅ 100% | `18.9Hz` 第四聲鐘響的心理聲學諧波拍頻轉譯（56.7Hz / 75.6Hz 差頻）、7 首原創循環 BGM、10 項動作與演出音效矩陣、首次互動解鎖規範。 |
| 10 | [`PRODUCTION_ROADMAP.md`](./PRODUCTION_ROADMAP.md) | ✅ 100% | Phase 6A 至 Phase 10 正式版漸進式開發計畫、與現有 Demo v0.4.0 的向下相容策略、Vitest 測試覆蓋計畫與 Web / Android / iOS 打包規劃。 |

---

## 二、設定一致性檢查與既有 Demo 銜接說明

依據開發規則第 8、9 條（「文件完成後檢查設定一致性。若發現衝突，先列出問題，不得自行改變核心世界觀」），我們對現有 Demo（Phase 1～4）與正式版（Phase 5）的設定進行了完整比對：

### 1. 發現的細部文案差異與無縫調和方案
- **【項目一：席位編號（Demo 文案「第30號」 vs 正式版核心設定「第29號席位」）】**
  - **狀況說明**：在 Phase 3 建立單一結局體驗版時，`src/data/campusAreas.ts` 的描述文字曾將班級人數寫為 29 人、失蹤的林曉月寫為「第 30 號座位」（主角為第 31 號）。而正式版核心世界觀確立為**「第29號席位」**（正常名冊 28 人，第 29 號為被認知過濾抹除的觀測席位）。
  - **調和處理**：
    1. 在本階段（Phase 5），我們嚴格遵守「不修改核心程式碼、不破壞現有 Demo 與測試」的規定，保留 `src/` 現有程式碼不動。
    2. 在正式版企劃文件（`WORLD_BIBLE.md`、`MAIN_STORY.md`）中，已全面統一採用**「第29號席位 / 第一章《第29張課桌》」**作為正式版標準設定。
    3. 待進入 Phase 6A/8 擴充正式版模式時，可讓「Demo 前導體驗模式」保留既有測試相容性，同時在「正式版四章模式」中呈現標準的 28 人名冊與「第29號席位」。
- **【項目二：主角姓名與背景具體化】**
  - **狀況說明**：Demo 中主角僅泛稱為「入學女學生（主角）」。
  - **調和處理**：正式版正式確立主角為**「蘇語晴」**，其入學動機為追查半年前曾坐過第29號席位並失蹤的雙胞胎姊姊**「蘇語嵐」**，與 Demo 中調查「林曉月失蹤海報」及「1998 年早於建校日的校務文件」完全吻合且無縫延伸。

### 2. 核心設計一致性確認清單
- **15 位角色一致性**：蘇語晴、蘇語嵐、林曉月、周予安、陳品妍、趙家豪、白川颯、葉思涵、陸子軒、沈知遠、許文謙、陳孟哲、白川鎮雄、白川鏡花、林靜儀在 `CHARACTER_DATABASE.md`、`CHARACTER_RELATIONSHIPS.md`、`MAIN_STORY.md`、`WORLD_MAP.md` 與 `ENDING_DESIGN.md` 中的身分、派系、駐留區域與支線完全一致。
- **14 張地圖一致性**：校門、公告欄、走廊、教室、教務處、教師辦公室、宿舍、舊圖書館、禁書室、頂樓、保健室、地下 B1、地下 B2、地下 B3 的連接關係在 `WORLD_MAP.md` 與各章節流程中完全一致。
- **C 結局 12 區域攻佔順序一致性**：在 `ENDING_DESIGN.md` 與 `GAMEPLAY_SYSTEMS.md` 中，C 結局（群體反抗／攻佔結局）嚴格遵循：
  **`校門 → 公告欄 → 走廊 → 教室 → 教師辦公室 → 宿舍 → 舊圖書館 → 頂樓 → 保健室 → 地下 B1 → B2 → B3`** 之推進順序。
- **8 大核心變數一致性**：`evidenceCompletion`、`injuryCount`、`studentAffinity`、`studentTrust`、`corporateAlert`、`experimentCorruption`、`publicExposure`、`academicCredits` 在 `GAMEPLAY_SYSTEMS.md` 與 `ENDING_DESIGN.md` 的判定公式中完全對齊。

---

## 三、目前專案程式碼與測試健康狀態

- 本階段僅於 `docs/production/` 新增企劃文件，未修改 `src/` 或 `tests/` 下任何一行程式碼。
- 現有 Demo 的 4 個測試套件（共 **23 項自動化測試**）與 TypeScript 型別檢查維持 **100% 通過**。

Phase 5 世界觀與十份正式版企劃文件重建已全部完成，請確認是否進入 **Phase 6A** 開發階段。
