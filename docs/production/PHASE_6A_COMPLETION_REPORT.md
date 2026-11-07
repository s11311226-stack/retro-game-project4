# 《無名校區》(Nameless Campus) Phase 6A 完成報告

- **專案名稱**：《無名校區》(Nameless Campus)
- **工作目錄**：`C:\Users\user\Desktop\Narrative Games`
- **階段名稱**：Phase 6A — 正式版核心系統開發（全域狀態、15 角色關係、證據與錯誤線索、任務系統、存檔相容擴充）
- **完成日期**：2026-11-07

---

## 一、開發前檢查與版本保護摘要

1. **Phase 5 正式版企劃文件核對**：
   - 已完整讀取並嚴格遵循 `docs/production/WORLD_BIBLE.md`、`MAIN_STORY.md`、`CHARACTER_DATABASE.md`、`CHARACTER_RELATIONSHIPS.md`、`GAMEPLAY_SYSTEMS.md`、`ENDING_DESIGN.md`、`PRODUCTION_ROADMAP.md` 及 `PHASE_5_COMPLETION_REPORT.md`。
2. **既有 Phase 0–4 Demo 保護與 Git Checkpoint**：
   - 開發前已建立本地 Git Checkpoint（`649e6f5`），確保隨時可安全回退。
   - 既有 Demo 四大場景（`SchoolGateScene`、`BulletinAreaScene`、`CorridorScene`、`ClassroomScene`）、`PlayerController`、`ExplorationStateManager`、`StoryStateManager`、`AudioSynthManager`、`MainMenuScene` 與原有的 23 項單元測試全數保留且 100% 通過。
   - 嚴格遵守安全規範，未執行任何 `git push` 或破壞性指令。

---

## 二、Phase 6A 新增與修改檔案清單

### 新增核心資料與系統模組 (`src/`)
1. `src/systems/GlobalGameState.ts`
   - 實作正式版 8 大核心全域變數管理、授權來源檢查 (`GlobalStateAuthSource`)、數值上下界限制与 `NaN`/`Infinity` 防護、唯讀凍結快照 (`getSnapshot`)、變更事件通知 (`onChange` / `GameEvents.GLOBAL_STATE_CHANGED`)、存檔序列化，以及五大結局預覽評估器 (`evaluatePreviewEnding` + `registerEndingEvaluatorHook`)。
2. `src/data/charactersCatalog.ts`
   - 完整建立 `CHARACTER_DATABASE.md` 中的 15 位核心角色靜態定義（涵蓋 `su_yuqing`、`su_yulan`、`lin_xiaoyue`、`zhou_yuan`、`chen_pinyan`、`zhao_jiahao`、`shirakawa_hayate`、`ye_sihan`、`lu_zixuan`、`shen_zhiyuan`、`xu_wenqian`、`chen_mengzhe`、`shirakawa_shizuo`、`shirakawa_kyoka`、`lin_jingyi`）。
3. `src/systems/CharacterRelationshipSystem.ts`
   - 管理 15 位角色的 `affinity` (0~100)、`trust` (0~100)、關係階段 (`tier: 1 | 2 | 3`) 與覺醒狀態 (`isAwakened`)。
   - 自動計算全體學生盟友的平均值並即時同步至 `GlobalGameState` 的 `studentAffinity` 與 `studentTrust`。
   - 支援一次性事件防重複機制 (`completedEventIds`) 與 `CHARACTER_RELATIONSHIPS.md` 定義的三大跨角色衝突處理 (`conflict_zhou_vs_zhao`、`conflict_ye_vs_chen`、`conflict_hayate_vs_pinyan`)。
4. `src/data/evidenceCatalog.ts`
   - 建立 17 項證據與錯誤線索定義，完整涵蓋既有 Demo 線索/物品 ID、第二至四章關鍵物證，以及 `MAIN_STORY.md` 定義的三大錯誤線索 (`rh_fake_love_letter`、`rh_forged_expulsion_form`、`rh_b2_power_lever`) 與其對應反證 ID (`counterEvidenceId`)。
5. `src/systems/EvidenceSystem.ts`
   - 支援證據收集（防重複收集）、深度分析 (`analyzeEvidence`)、以反證識破錯誤線索 (`debunkRedHerring`)、誤信錯誤線索陷阱懲罰 (`triggerRedHerringTrap`，具備單次防重）、多條件篩選查詢 (`queryCollectedEvidence`)，並自動計算 `evidenceCompletion` (0~100) 同步至 `GlobalGameState`。
6. `src/data/questsCatalog.ts`
   - 將任務靜態定義與執行邏輯分離，涵蓋四大章節主線任務 (`main`)、角色專屬任務 (`character`) 與校園調查支線任務 (`side`)。
7. `src/systems/QuestSystem.ts`
   - 支援前置條件檢查（旗標、已完成任務、證據、角色信任度／好感度、學業學分）、任務啟動 (`startQuest`)、完成與獎勵發放 (`completeQuest`)、失敗判定 (`failQuest`)、自動同步評估 (`evaluateAndSyncQuests`)，並具備單次獎勵防重複發放保護。

### 相容擴充與場景整合修改檔案
8. `src/types/index.ts`：新增 Phase 6A 所有型別介面，並將 `SAVE_SCHEMA_VERSION` 升至 `3`（保留 `LEGACY_SAVE_SCHEMA_VERSION_V1 = 1` 與 `LEGACY_SAVE_SCHEMA_VERSION_V2 = 2`）。
9. `src/core/EventBus.ts`：新增 `GLOBAL_STATE_CHANGED`、`RELATIONSHIP_UPDATED`、`EVIDENCE_UPDATED`、`QUEST_UPDATED` 事件常數。
10. `src/systems/SaveManager.ts`：擴充支援儲存與還原 `phase6a` 四大系統狀態，並支援將舊版 `schemaVersion: 1` 與 `schemaVersion: 2` 存檔無縫升級至 `v3`（自動將既有 Demo 已收集線索與物品匯入 `EvidenceSystem` 並同步任務狀態）。
11. `src/scenes/BaseExplorationScene.ts`、`src/scenes/MainMenuScene.ts`、`src/scenes/UIScene.ts`：
    - 探索場景互動取得物品或線索時，自動同步至 `globalEvidenceSystem` 與 `globalQuestSystem`。
    - 於 `UIScene` 的背包與線索視窗 (`[I / Tab]`) 新增「切換：正式版系統狀態面板」與「🔬 深度分析已收集證據」功能按鈕，可即時檢視 8 大核心變數、結局預測、任務清單、證據分析狀態與角色關係。

### 新增單元測試檔案 (`tests/`)
12. `tests/globalGameState.test.ts` (4 項測試)
13. `tests/characterRelationshipSystem.test.ts` (4 項測試)
14. `tests/evidenceSystem.test.ts` (4 項測試)
15. `tests/questSystem.test.ts` (4 項測試)
16. `tests/phase6aSaveMigration.test.ts` (2 項測試)

---

## 三、品質驗收與自動化測試結果

| 檢查項目 | 執行指令 | 結果 | 說明 |
| :--- | :--- | :--- | :--- |
| TypeScript 型別檢查 | `npm run typecheck` | ✅ 通過 (0 errors) | 嚴格模式 `noUnusedLocals` / `noUnusedParameters` 全數通過 |
| Vitest 單元測試 | `npm test` | ✅ 通過 (9 test files, 41 tests) | 原有 23 項 Demo 測試 + 新增 18 項 Phase 6A 測試全數通過 |
| Vite 正式環境建置 | `npm run build` | ✅ 通過 | 成功產出 `dist/` 正式建置產物 |
| 瀏覽器預覽伺服器 | `http://127.0.0.1:5173/` | ✅ 正常運作 | 可直接遊玩既有 Demo 並於遊戲內 `[I / Tab]` 切換檢視 Phase 6A 正式版系統面板 |

---

## 四、後續階段 (Phase 6B) 銜接準備

- `GlobalGameState`、`CharacterRelationshipSystem`、`EvidenceSystem`、`QuestSystem` 與 `SaveManager (v3)` 已完成解耦設計與事件匯流排整合。
- 下一階段 **Phase 6B** 可直接在此基礎上擴充新地圖區域、NPC 對話互動樹、學業測驗／校規系統與敵對巡邏潛行機制，無須重構核心狀態架構。
