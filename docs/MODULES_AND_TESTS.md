# 模組架構說明與完整測試報告 (Phase 1 ~ Phase 4)

## 1. 核心模組架構

### A. 資料與設定層 (`src/config/` & `src/data/`)
- **`src/config/playerConfig.ts`**：定義 `640×360` 邏輯解析度、`128×128` 角色畫布與 `28×64` 獨立碰撞箱參數、移動/跳躍/攻擊三階段時序與預設鍵鼠綁定。
- **`src/data/campusAreas.ts`**：集中定義四個可探索區域（`school_gate`、`bulletin_area`、`corridor`、`classroom`）的邊界、出生點與所有互動物件定義（每個互動物件皆具備穩定唯一識別 ID）。
- **`src/data/storyScript.ts`**：集中管理體驗版章節「點名簿上不存在的人」的所有劇情事件 (`DEMO_STORY_EVENTS`)、觸發條件旗標與對白文本。

### B. 系統與狀態管理層 (`src/systems/`)
- **`src/systems/InputManager.ts`**：集中管理鍵盤與滑鼠輸入快照，並在瀏覽器失焦或打開互動視窗時自動清除殘留按鍵。
- **`src/systems/ExplorationStateManager.ts`**：管理當前區域、安全落地出生點計算、背包物品 (`inventoryMap`)、已拾取物件集合 (`collectedObjectIds`) 與調查線索 (`cluesMap`)，並提供存檔狀態還原方法 `restoreFromSaveData()`。
- **`src/systems/StoryStateManager.ts`**：管理劇情旗標 (`StoryFlagId`) 與已完成事件 (`completedEventIds`)，實作未來多結局擴充介面 `IMultiEndingExtensionHooks`，並提供存檔還原方法 `restoreFromSaveData()`。
- **`src/systems/SaveManager.ts`**：
  - 使用版本化結構 `GameSavePayloadV2` (`schemaVersion: 2`) 儲存玩家位置、已取得物品、已讀線索及劇情旗標。
  - 實作 `loadAndValidateSave()`：檢查 JSON 損毀 (`corrupted_json`)、缺少必要欄位 (`invalid_schema`)、不支援版本 (`unsupported_version`)，並支援從舊版 `v1` 自動遷移至 `v2`。
  - 實作 `assertNoSecretFields()`：阻擋任何包含 `password`、`token`、`secret`、`apiKey` 等機密名稱的欄位寫入存檔。
- **`src/systems/AudioSynthManager.ts`**：
  - 遵循瀏覽器自動播放規範，僅在使用者首次互動 (`unlockByUserGesture`) 後啟用 Web Audio 播放。
  - 提供原創可循環播放的懸疑校園背景音樂 (BGM) 與可獨立調整並持久化的音樂/音效音量 (`bgmVolume`, `sfxVolume`, `muted`)。
  - 涵蓋 7 類必備音效：腳步 (`playFootstep`)、跳躍 (`playJump`)、攻擊 (`playAttack`)、格擋 (`playBlock`)、互動/拾取 (`playUiClick`, `playItemPickup`)、開門 (`playDoorOpen`)、神祕訊息演出 (`playAnomalyGlitchStinger`)。

### C. 場景與平行 UI 層 (`src/scenes/`)
- **`MainMenuScene.ts`**：主選單場景，支援「開始新遊戲」、「讀取存檔繼續」、存檔健康狀態提示，以及音樂/音效音量調整。
- **`BaseExplorationScene.ts`** 與四大場景類別（`SchoolGateScene`, `BulletinAreaScene`, `CorridorScene`, `ClassroomScene`）：整合移動戰鬥、環境互動、劇情演出、自動與手動存讀檔及動作音效。
- **`UIScene.ts`**：平行運行的 UI 覆蓋層，包含探索 HUD、底部互動提示列、劇情對話框、調查視窗、文件閱讀器、背包與線索面板、內建存讀檔與音量控制的暫停選單，以及體驗版通關結算畫面。

---

## 2. 品質驗收與自動化測試報告 (`npm test`)

共 **4 個測試套件、23 項自動化測試案例全數通過 (`23 passed`)**：

| 測試檔案 | 測試案例數 | 驗證重點摘要 | 結果 |
| :--- | :---: | :--- | :---: |
| `tests/playerController.test.ts` | 7 | `128×128` 畫布對 `28×64` 獨立碰撞箱、左右移動與轉身、跳躍與地板碰撞、攻擊三階段有效判定視窗與冷卻、格擋與攻擊不互卡、暫停凍結、視窗失焦防卡鍵 | ✅ PASS |
| `tests/explorationSystem.test.ts` | 7 | 四大區域獨立邊界、所有必備互動物件穩定 ID、距離判定與滑鼠選取、單一主要互動鎖定、文件重複閱讀不重複新增線索、已拿取物品不重複生成、門切換與鑰匙解鎖及安全落地座標 | ✅ PASS |
| `tests/storySystem.test.ts` | 4 | 校門入學演出不重複觸發、完整體驗版通關流程（「點名簿上不存在的人」与「新生已完成觀察」演出及重新開始重置）、非線性調查順序防軟鎖、未來多結局擴充介面 | ✅ PASS |
| `tests/saveAndAudioSystem.test.ts` | 5 | V2 版本化存檔寫入與完整讀檔還原、損毀 JSON 與缺漏欄位攔截、舊版 V1 存檔自動遷移與越界座標修正、禁止寫入密碼/Token 機密欄位檢查、首次互動前音訊不自動播放與 BGM/SFX 音量調整及 7 類音效覆蓋 | ✅ PASS |

---

## 3. 下一階段（正式版）開發建議
1. **正式像素美術與動畫替換**：透過既有的 `ICharacterVisualAdapter` 與 `IInteractableVisualAdapter` 介面，將占位繪圖無縫替換為 128×128 角色 SpriteSheet 與場景 Tilemap 素材。
2. **多章節與多結局展開**：利用 `StoryStateManager` 已預留的 `IMultiEndingExtensionHooks`（證據完整度、NPC 好感度、財閥警戒度），擴充第二章節「地下檔案室」與多結局分歧。
3. **多重存檔槽位 (Save Slots)**：在 `SaveManager` 現有的版本化驗證架構上，將儲存鍵擴充為 Slot 1 ~ Slot 3 供玩家自由選擇。
