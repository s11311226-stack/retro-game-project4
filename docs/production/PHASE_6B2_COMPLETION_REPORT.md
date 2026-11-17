# 《無名校區》Phase 6B-2：字體、操作與三棟五層校園結構改造完成報告

**文件版本**：v1.0.0  
**完成日期**：2026 年 11 月 14 日  
**專案位置**：`C:\Users\user\Desktop\Narrative Games`  
**核心主導**：資深 Phaser 3 / TypeScript 遊戲架構師、關卡設計師、UI/UX 工程師與測試工程師  
**Git Checkpoint 標籤**：`checkpoint-phase6b2-pre` (基線 commit `6a664b2`)  

---

## 執行摘要 (Executive Summary)

本階段依據使用者遊玩反饋與正式版企劃藍圖，針對《無名校區》(Nameless Campus) 的三大核心痛點進行了全面重構與深度升級：

1. **繁體中文字體清晰度徹底改善**：解決原本 640×360 像素放大時複雜漢字（如「鬱」、「驫」、「觀」）筆畫模糊的根本成因。在 `BootScene` 建立異步 CSS 字體預載機制，確保全遊戲在文字建立前完成 Noto Sans TC 載入；將正文、選單與文件字級全面提升至 16px（重要標題 20px、說話者 17px、次要提示 >= 12px）；並在主選單與暫停選單內建專屬「繁體字體清晰度檢測展示畫面 (Font Showcase)」。
2. **操作體驗革命 — Shift 奔跑與耐力系統**：將左/右 Shift 鍵由原本的格擋改為奔跑（格擋保留右鍵與 K 鍵），奔跑移動速度達 240px/s（步行的 1.6 倍）；導入 100 點耐力條（奔跑消耗 25/s、待機/步行恢復 20/s、歸零進入力竭狀態並強制降為步行，需恢復至 25 以上方可重啟衝刺）；角色奔跑時噪音半徑擴大至 150px、腳步聲音頻與節奏加倍、並有琥珀色衝刺視覺回饋與空中奔跑跳躍動量繼承。
3. **三棟五層 2D 側視校園網格改造**：將校園從原本零散的 11 個場景，系統化重組為**左棟（教學區）、中間棟（交通樞紐）、右棟（活動與研究區）各五層樓**，加上地面層（校門廣場）與地下三層深層實驗設施（B1 地下通道、B2 秘密研究室、B3 回聲搖籃核心），共計 19 處正式場景。每層樓均設有橫向連通走廊，中間棟兩側設有跨樓層垂直階梯。
4. **全校導覽地圖視窗 (Campus Map Modal)**：按下 `[M]` 或點擊頂部 HUD 地圖按鈕即可呼叫 3×5 + 地下室全校地圖，動態高亮「📍 你在此處」、區分「✓ 已探索」與「??? 未探索」房間，點擊房間即時顯示連通出入口與調查情報。
5. **存檔 V3 結構與測試全數通過**：存檔系統升級為 Schema v3（完整儲存耐力值與已探索房間清單），並 100% 向下相容舊版存檔；11 組測試套件、60 項自動化測試全部通過（46 項既有測試 + 14 項新增測試），Vite Production Build 零錯誤產出。

---

## 第一章：繁體中文字體系統全面改造

### 1.1 模糊成因深度分析與解決方案

- **成因分析**：
  1. Phaser 設定了 `pixelArt: true`，在 640×360 邏輯解析度下預設使用最近鄰縮放（Nearest-Neighbor）。
  2. 繁體中文字體筆畫繁複（平均 12~24 畫），若在文字物件尚未完成字體檔案加載即進行渲染，會導致回退至系統預設襯線字或失真字型。
  3. 原本部分介面字級為 14px 甚至 11px，在像素縮放後微小筆畫粘連糊死。
- **解決對策**：
  1. **預載保障**：在 [BootScene.ts](file:///C:/Users/user/Desktop/Narrative Games/src/scenes/BootScene.ts) 引入異步等待 `globalFontManager.ensureFontsReady()`，並以 `document.fonts.load()` 預先快取 `Noto Sans TC` 常用字重（400 與 700）。
  2. **嚴格字級標準**：在 [TypographyConfig.ts](file:///C:/Users/user/Desktop/Narrative Games/src/config/TypographyConfig.ts) 與全域設定中，嚴格規範：
     - **重要標題 (importantPrompt)**: 20px
     - **說話者角色名稱 (speakerName)**: 17px, bold
     - **對白正文 (dialogueBody)**: 16px, lineSpacing: 6
     - **選單項目按鈕 (menuItem)**: 16px, bold
     - **調查文件正文 (documentBody)**: 16px, lineSpacing: 4
     - **次要狀態提示 (secondaryHint)**: 12px (系統絕對底限，嚴禁任何繁體中文低於 12px)
  3. **像素抗鋸齒對齊**：所有文字建立皆透過 `FontManager.createCrispText()`，啟用 `roundPixels: true` 與原尺寸高清晰度渲染。

### 1.2 專屬字體清晰度檢測展示畫面 (Font Showcase)

玩家與測試人員可隨時於：
- **主選單畫面**：點擊「🔤 繁體字體清晰度檢測展示 [F]」按鈕或直接按鍵盤 `[F]`
- **遊戲中暫停選單**：按 `[Esc]` 或 `[P]` 開啟暫停選單，點擊「🔤 繁體字體清晰度檢測展示」

展示內容包含：
1. **極限高難度生僻字筆畫實測**：`鬱 驫 鸞 鑿 囊 釁 灤 鱟 籲 驚 艷 嚴 龜 囑 攬 疊 驟 體`
2. **世界觀核心長句排版實測**：
   - 「白川財閥於1954年創立私立白川學園，地下三層隱藏回聲搖籃人體實驗。」
   - 「18.9Hz第四聲鐘響伴隨認知過濾，第29號席位之謎終將揭曉。」
3. **全半形、標點符號與英數對齊測試**：`0123456789 | AaBbCcZz | 18.9Hz | 【】『』「」——……！？：；、（）《》`
4. **字級規範階梯對照**：20px、17px、16px、12px
5. **高對比色彩框測試**：深底白字（#020617 / #f8fafc）與淺底黑字（#f1f5f9 / #0f172a）

---

## 第二章：Shift 奔跑與耐力條系統

### 2.1 按鍵映射配置 (Key Binding)

| 操作動作 | 主要按鍵 | 輔助按鍵 | 說明 |
| :--- | :--- | :--- | :--- |
| **奔跑 (Sprint)** | `ShiftLeft` | `ShiftRight` | **按住奔跑**，移動時速提升至 240px/s |
| **移動 (Move)** | `KeyA` / `KeyD` | `ArrowLeft` / `ArrowRight` | 正常步行時速 150px/s |
| **跳躍 (Jump)** | `Space` | `KeyW` / `ArrowUp` | 地面起跳，奔跑起跳保留衝刺水平初速 |
| **攻擊 (Attack)** | `滑鼠左鍵` | `KeyJ` | 兩段揮拳/刺擊判定 |
| **格擋 (Block)** | `滑鼠右鍵` | `KeyK` | 舉手格擋，格擋期間耐力持續恢復 |
| **互動 (Interact)** | `KeyE` | `滑鼠左鍵點擊物件` | 調查、對話、開門、拾取 |
| **校園地圖 (Map)** | `KeyM` | `頂部 HUD 🗺️地圖按鈕` | 開啟/關閉 3×5 校園地圖 |
| **調查中心 (Hub)** | `KeyI` | `Tab` / `右上角🎒按鈕` | 背包、證據庫、任務清單、角色關係 |
| **系統選單 (Pause)**| `Escape` | `KeyP` | 暫停遊戲、存檔/讀檔、音量與時段調整 |

### 2.2 耐力力竭機制 (Stamina & Exhaustion Dynamics)

- **最大耐力**：100 點。
- **奔跑消耗率**：25 點 / 秒（滿耐力可連續奔跑 4.0 秒）。
- **待機與步行恢復率**：20 點 / 秒（由 0 完全回滿需 5.0 秒）。
- **力竭狀態 (Exhaustion)**：
  - 當耐力扣至 0 時，角色立即進入力竭狀態。
  - 力竭時速度被強制壓回 150px/s（步行速度），即使持續按住 Shift 也無法奔跑。
  - 角色必須讓耐力自然恢復至 **25 點（門檻值）以上**，力竭鎖定才會解除並允許重新奔跑。
- **噪音半徑調變**：
  - 步行：噪音半徑 60px。
  - 奔跑：噪音半徑擴大至 150px（更易引起巡邏警衛與怪異警戒）。
  - 音效同步：奔跑時腳步聲頻率加快（間隔由 300ms 縮短至 160ms），音量增益由 0.12 提高至 0.22。
- **HUD 視覺回饋**：
  - 頂部 HUD (8, 36) 繪製即時耐力條：正常為翡翠綠，耐力 < 30% 轉為琥珀橙，力竭時轉為警示紅。
  - 角色占位視覺回饋：奔跑時角色本體變更為衝刺琥珀色 (`0xf59e0b`)、步頻大幅加速、背後生成速度殘影粒子線條。

---

## 第三章：三棟五層校園結構改造 (3 Buildings × 5 Floors Grid)

校園由原本散落的場景重組為嚴謹的 3 棟 × 5 層 2D 橫向探索空間，所有 19 處場景皆具備清楚的棟別、樓層、房間名與雙向連通通道：

```
       【左棟 (教學區)】             【中間棟 (交通樞紐)】             【右棟 (活動與研究區)】
5F   屋頂西側 (rooftop_west)    ══   屋頂花園 (rooftop)        ══   屋頂設備室 (rooftop_equipment)
                                             🪜 (垂直階梯)
4F   特殊教室 (special_classroom) ══   資料室 (old_library)      ══   學生會室 (forbidden_archive)
                                             🪜 (垂直階梯)
3F   2年B班 (classroom_2b)      ══   走廊東側 (academic_office) ══   學生活動室 (student_activity_room)
                                             🪜 (垂直階梯)
2F   2年A班 (classroom)         ══   走廊西側 (corridor)        ══   理科實驗室 (dormitory)
                                             🪜 (垂直階梯)
1F   教職員室 (teachers_office)  ══   中央大廳 (bulletin_area)   ══   保健室 (infirmary)
                                             ║ (中央出入口)
G/1F                                校門前廣場 (school_gate)
                                             ║ (地下封閉通道)
B1~B3 地下通道 (underground_b1) ══ 秘密研究室 (underground_b2) ══ 回聲搖籃核心 (underground_b3)
```

### 3.1 完整 19 處場景詳細資訊對照表

| 場景編號 | 區域識別碼 (AreaId) | 棟別 | 樓層 | 完整顯示名稱 | 主要特徵與調查標的 |
| :---: | :--- | :---: | :---: | :--- | :--- |
| **01** | `school_gate` | 室外 | 地面 | 校園正門｜地面｜校門口外圍 | 濃霧校門、失蹤告示、西元2004啟用銘牌 |
| **02** | `bulletin_area` | 中間棟 | 1F | 中間棟｜1F｜穿堂與公告欄 (中央大廳) | 核心穿堂、大廳布告欄、通往左棟/右棟/2F樓梯/校門 |
| **03** | `teachers_office` | 左棟 | 1F | 左棟｜1F｜教師辦公室 | 班導許文謙、三年丙班原始點名簿、偽造退學公文 |
| **04** | `infirmary` | 右棟 | 1F | 右棟｜1F｜保健室 | 校醫林靜儀/葉思涵、醫療紀錄、安神藥劑、時段休息床鋪 |
| **05** | `classroom` | 左棟 | 2F | 左棟｜2F｜普通教室 3-C (2年A班) | 主角蘇語晴座位、第29號刻痕課桌、黑板值日生名單 |
| **06** | `corridor` | 中間棟 | 2F | 中間棟｜2F｜走廊與研究資料室 (走廊西側) | 班長周予安、陳品妍、班級名冊公文櫃、中央棟主樓梯 |
| **07** | `dormitory` | 右棟 | 2F | 右棟｜2F｜舊宿舍與理化交誼廳 (理科實驗室) | 趙家豪、破損隨身聽、黃銅密碼儲物櫃 |
| **08** | `classroom_2b` | 左棟 | 3F | 左棟｜3F｜普通教室 2-B | 蘇語嵐高二同級生塗鴉、白川財閥實習簽呈、班級置物櫃 |
| **09** | `academic_office` | 中間棟 | 3F | 中間棟｜3F｜教務處與學籍檔案室 (走廊東側) | 教務主任沈知遠、第29號學籍除籍令、通往4F樓梯 |
| **10** | `student_activity_room`| 右棟 | 3F | 右棟｜3F｜學生活動中心自治室 | 學生自治會秘密備忘錄、白川校區監視鏡頭配線圖 |
| **11** | `special_classroom` | 左棟 | 4F | 左棟｜4F｜特殊教育暨心理諮商室 | 白川颯私人物品、特殊心理評量報告、通往5F樓梯 |
| **12** | `old_library` | 中間棟 | 4F | 中間棟｜4F｜舊圖書館古籍閱覽室 (資料室) | 1979年地契與地下設施藍圖、微縮膠卷機、通往禁書室暗門 |
| **13** | `forbidden_archive` | 右棟 | 4F | 右棟｜4F｜禁書室特藏密室 (學生會室) | 白川鏡花名牌、歷屆第29號受試者名單、財閥密函 |
| **14** | `rooftop_west` | 左棟 | 5F | 左棟｜5F｜天台西側觀測平台 | 次聲波干擾器殘骸、校舍最高點俯瞰全景、夜間觀測點 |
| **15** | `rooftop` | 中間棟 | 5F | 中間棟｜5F｜頂樓鐘塔花園 | 18.9Hz次聲波共振第四聲大鐘、陸子軒、黃昏氛圍推進點 |
| **16** | `rooftop_equipment` | 右棟 | 5F | 右棟｜5F｜頂樓中央機房設備室 | 高壓電器配電盤、共振訊號中繼擴音器、廣播主控鎖 |
| **17** | `underground_b1` | 地下 | B1 | 地下禁區｜B1｜深層地下通道 | 認知過濾警告壁標、生化氣密閘門、巡邏警戒線 |
| **18** | `underground_b2` | 地下 | B2 | 地下禁區｜B2｜秘密生化實驗設施 | 廢棄生態觀察艙、第29號席位蘇語嵐臨床病歷 |
| **19** | `underground_b3` | 地下 | B3 | 地下禁區｜B3｜回聲搖籃核心 | 巨型次聲波共振圓柱、蘇語嵐意識沉睡主控機、回聲終局報告 |

---

## 第四章：全校導覽地圖介面 (Interactive Campus Map)

- **快捷觸發**：
  - 鍵盤按下 `[M]`
  - 點擊畫面頂部 HUD 快捷按鈕 `[🗺️ 地圖 [M]]`
  - 關閉：按 `[M]`、`[Esc]` 或點擊右上角 `[✕ 關閉]`
- **介面佈局**：
  - 上方標題與連通提示列。
  - 核心 3×5 方格佈局：清楚劃分「【左棟教學區】」、「【中間棟交通樞紐】」、「【右棟活動與研究區】」。
  - 樓層走廊連通線（`══`）與跨樓層垂直樓梯圖標（`🪜`）。
  - 下方陳列「校門前廣場 (1F/G)」與「地下深層管制設施 (B1~B3)」。
- **動態狀態渲染**：
  - **當前位置**：金黃高亮框（`0x78350f` / 金黃邊框）、右上角標記 `[📍你在這]`。
  - **已探索區域**：翡翠綠底框（`0x064e3b`）、右上角標記 `[✓]`。
  - **未探索區域**：深石板暗灰底框（`0x0f172a`）、文字顯示 `[??? 未探索]`。
- **互動房間詳細情報**：
  - 游標懸停或點擊任一房間單元格，底部狀態列即時顯示該房間完整棟別樓層、簡介、所有連通通道名稱以及是否需要門禁鑰匙。

---

## 第五章：存檔系統 Schema v3 升級與相容性

- **Schema 版本**：升級為 `schemaVersion: 3`。
- **新增存檔欄位**：
  - `player.stamina`：保存玩家當前耐力數值（0~100）。
  - `exploration.exploredAreaIds`：保存玩家目前已踏足探索過的所有場景 ID 陣列。
- **向下相容遷移 (Migration Guarantee)**：
  - 讀取 v1 或 v2 舊存檔時，自動補齊 `stamina: 100`，並將當前所在的 `player.areaId` 自動加入 `exploredAreaIds`。
  - 舊版存檔讀取後不需重新開局，無損升級為 v3。

---

## 第六章：測試與建置驗證結果

### 6.1 自動化測試 (Vitest Test Suites)

執行指令：`npm test`

```
 ✓ tests/explorationSystem.test.ts (7 tests)
 ✓ tests/globalGameState.test.ts (4 tests)
 ✓ tests/characterRelationshipSystem.test.ts (4 tests)
 ✓ tests/playerController.test.ts (7 tests)
 ✓ tests/storySystem.test.ts (4 tests)
 ✓ tests/evidenceSystem.test.ts (4 tests)
 ✓ tests/questSystem.test.ts (4 tests)
 ✓ tests/saveAndAudioSystem.test.ts (5 tests)
 ✓ tests/phase6bExplorationNpcAndFont.test.ts (5 tests)
 ✓ tests/phase6aSaveMigration.test.ts (2 tests)
 ✓ tests/phase6b2FontSprintMap.test.ts (14 tests)

 Test Files  11 passed (11)
      Tests  60 passed (60)
   Duration  2.00s
```

### 6.2 TypeScript 型別檢查

執行指令：`npm run typecheck`

```
> unnamed-campus@0.1.0 typecheck
> tsc --noEmit
[Exit Code: 0 - 零型別錯誤]
```

### 6.3 生產環境建置 (Production Build)

執行指令：`npm run build`

```
✓ 45 modules transformed.
dist/index.html                    1.76 kB │ gzip:   0.83 kB
dist/assets/index-GMTswi4t.js  1,778.22 kB │ gzip: 429.12 kB
✓ built in 7.31s
[Exit Code: 0 - 正式生產包產出完整]
```

---

## 總結

Phase 6B-2 的所有核心目標皆已高標準達成：繁體字體清晰無瑕、Shift 奔跑手感流暢敏捷、三棟五層 19 個場景結構嚴整、全校地圖導覽資訊完整。本專案已具備深厚且穩固的架構，可無縫銜接後續 Phase 7（戰鬥與潛行擴展）及 Phase 8（四大章節完整流程推進）。
