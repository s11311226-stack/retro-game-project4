# 《無名校區》(Nameless Campus) Phase 6B-2 R1 完成報告
**階段主題：三棟五層公共走廊連通與室內場景分離修正 (Corridor Network & Indoor Room Separation)**

---

## 1. 原本三棟五層架構無法真正連通的原因

在修正前的 Phase 6B-2 版本中，雖然程式碼內有 19 個場景並標註了棟別與樓層，但實際遊玩時仍像只有一棟學校，根本原因如下：

1. **缺乏獨立的「三棟 × 五層」公共走廊網路**：原本只有一個舊版 `corridor`（學校走廊）與 `bulletin_area`（穿堂公告欄），其餘樓層與棟別都是直接將「室內房間」當成網格節點。
2. **沒有走廊左右邊界跨棟切換機制**：原本玩家走到走廊左端或右端時只會撞上紅色邊界牆（`minX` / `maxX`），無法從每層樓的建築邊界自然走向相鄰棟的同樓層走廊。
3. **跨棟傳送門被塞進室內房間內部**：原本為了湊齊連通，把通往左棟或右棟的傳送門直接放在「教務處」、「特殊教室」或「屋頂」等房間內，導致玩家不進房間就無法跨棟，且空間邏輯完全不符合真實校園動線。

---

## 2. 原本直接出現在室內場景的原因

1. **樓梯直接指向室內房間 Scene**：在修正前，從 1F/2F 往上走樓梯時，`portal.targetAreaId` 直接設定為 `academic_office`（教務處）、`old_library`（舊圖書館）或 `special_classroom`（特殊教室），而非各樓層的公共走廊。
2. **未區分「公共走廊 (`isCorridor: true`)」與「室內房間 (`isCorridor: false`)」**：原本沒有將樓層主幹道（走廊）與附屬空間（教室/辦公室/宿舍/實驗室）分層，導致切換樓層或跨棟時直接落入室內場景。

---

## 3. 原本房門重疊與走廊擁擠的原因

1. **單一場景塞入過多跨層與跨棟傳送門**：原本舊 `corridor`（寬度僅 `1120px`）與 `academic_office`（寬度僅 `1180px`）同時塞入了通往教職員室、普通教室、2年B班、舊圖書館、學生宿舍、學生活動室等多達 6～8 個傳送門與 NPC／調查點。
2. **缺乏房門最小中心間距與互動半徑非重疊約束**：原本多個傳送門的 X 座標間距僅 `90px～130px`，當兩扇門的 `interactionRadius`（`65px～75px`）相加時產生重疊區，導致玩家站在走廊中段時互動提示頻繁跳動、門框與文字標籤視覺擁擠重疊。

---

## 4. 新增或重構的 15 個公共走廊場景清單

本次 R1 正式建立 **3 棟 × 5 層 = 15 個獨立公共走廊場景**（每個走廊寬度統一擴展為 `1680px`，`isCorridor: true`），並新增右棟 4F 預留可解鎖房間 `science_reserve_4f`（封存理化準備室），定義於 `src/data/campusCorridorNetwork.ts` 與 `src/scenes/CampusGridScenes.ts`：

| 編號 | 走廊 Scene ID (`AreaId`) | Phaser Scene Key | 棟別 (`building`) | 樓層 (`floor`) | 走廊顯示名稱 (`fullDisplayName`) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 1 | `corridor_left_1f` | `CorridorLeft1FScene` | `left` (左棟) | `1F` (`1`) | `左棟｜1F｜1F 公共走廊` |
| 2 | `corridor_left_2f` | `CorridorLeft2FScene` | `left` (左棟) | `2F` (`2`) | `左棟｜2F｜2F 公共走廊` |
| 3 | `corridor_left_3f` | `CorridorLeft3FScene` | `left` (左棟) | `3F` (`3`) | `左棟｜3F｜3F 公共走廊` |
| 4 | `corridor_left_4f` | `CorridorLeft4FScene` | `left` (左棟) | `4F` (`4`) | `左棟｜4F｜4F 公共走廊` |
| 5 | `corridor_left_5f` | `CorridorLeft5FScene` | `left` (左棟) | `5F` (`5`) | `左棟｜5F｜5F 公共走廊` |
| 6 | `corridor_center_1f` | `CorridorCenter1FScene` | `center` (中間棟) | `1F` (`1`) | `中間棟｜1F｜1F 中央穿堂走廊` |
| 7 | `corridor_center_2f` | `CorridorCenter2FScene` | `center` (中間棟) | `2F` (`2`) | `中間棟｜2F｜2F 公共走廊` |
| 8 | `corridor_center_3f` | `CorridorCenter3FScene` | `center` (中間棟) | `3F` (`3`) | `中間棟｜3F｜3F 公共走廊` |
| 9 | `corridor_center_4f` | `CorridorCenter4FScene` | `center` (中間棟) | `4F` (`4`) | `中間棟｜4F｜4F 公共走廊` |
| 10 | `corridor_center_5f` | `CorridorCenter5FScene` | `center` (中間棟) | `5F` (`5`) | `中間棟｜5F｜5F 公共走廊` |
| 11 | `corridor_right_1f` | `CorridorRight1FScene` | `right` (右棟) | `1F` (`1`) | `右棟｜1F｜1F 公共走廊` |
| 12 | `corridor_right_2f` | `CorridorRight2FScene` | `right` (右棟) | `2F` (`2`) | `右棟｜2F｜2F 公共走廊` |
| 13 | `corridor_right_3f` | `CorridorRight3FScene` | `right` (右棟) | `3F` (`3`) | `右棟｜3F｜3F 公共走廊` |
| 14 | `corridor_right_4f` | `CorridorRight4FScene` | `right` (右棟) | `4F` (`4`) | `右棟｜4F｜4F 公共走廊` |
| 15 | `corridor_right_5f` | `CorridorRight5FScene` | `right` (右棟) | `5F` (`5`) | `右棟｜5F｜5F 公共走廊` |

---

## 5. 三棟五層房間與房門配置表

所有室內房間 (`isCorridor: false`) 皆從公共走廊分離，必須在對應走廊走到房門前按 `E` 才會進入，從房間內出口按 `E` 則精確返回原走廊的該房門正前方 (`returnX`)：

| 樓層 | 左棟走廊與房門配置 | 中間棟走廊與房門配置 | 右棟走廊與房門配置 |
| :--- | :--- | :--- | :--- |
| **5F** | `corridor_left_5f`<br>🚪 `door_left_5f_rooftop_west` (`x=680`)<br>→ **西側屋頂** (`rooftop_west`) | `corridor_center_5f`<br>🚪 `door_center_5f_rooftop` (`x=840`)<br>→ **屋頂花園與鐘塔** (`rooftop`) | `corridor_right_5f`<br>🚪 `door_right_5f_rooftop_equipment` (`x=960`)<br>→ **屋頂設備室** (`rooftop_equipment`) |
| **4F** | `corridor_left_4f`<br>🚪 `door_left_4f_special_classroom` (`x=680`)<br>→ **特殊教室** (`special_classroom`) | `corridor_center_4f`<br>🔒 `door_center_4f_forbidden_archive` (`x=840`)<br>→ **禁書室** (`forbidden_archive`，需禁書室銅鑰匙) | `corridor_right_4f`<br>🔒 `door_right_4f_science_reserve` (`x=960`)<br>→ **封存理化準備室** (`science_reserve_4f`，需黃銅校徽名牌) |
| **3F** | `corridor_left_3f`<br>🚪 `door_left_3f_classroom_2b` (`x=680`)<br>→ **2年B班教室** (`classroom_2b`) | `corridor_center_3f`<br>🚪 `door_center_3f_old_library` (`x=840`)<br>→ **舊圖書館** (`old_library`) | `corridor_right_3f`<br>🚪 `door_right_3f_student_activity` (`x=960`)<br>→ **學生活動室** (`student_activity_room`) |
| **2F** | `corridor_left_2f`<br>🔒 `door_left_2f_classroom` (`x=680`)<br>→ **普通教室（三年丙班）** (`classroom`，需生鏽鑰匙) | `corridor_center_2f`<br>🚪 `door_center_2f_academic` (`x=840`)<br>→ **教務處** (`academic_office`) | `corridor_right_2f`<br>🚪 `door_right_2f_dormitory` (`x=960`)<br>→ **學生宿舍** (`dormitory`) |
| **1F** | `corridor_left_1f`<br>🚪 `door_left_1f_teachers` (`x=680`)<br>→ **教師辦公室** (`teachers_office`) | `corridor_center_1f`<br>🏛️ 整合**公佈欄區**（失蹤海報、生鏽鑰匙、陳品妍）<br>🚪 `portal_center_1f_to_gate` (`x=550`) → **校門廣場** (`school_gate`) | `corridor_right_1f`<br>🚪 `door_right_1f_infirmary` (`x=960`)<br>→ **保健室** (`infirmary`，內含 B1 升降梯入口) |

---

## 6. 跨棟邊界連通規則 (`BUILDING_BOUNDARY_CONNECTIONS`)

每一層（`1F～5F`）均遵守以下水平跨棟連通拓撲：

```text
[左棟外牆 x=0] ── 左棟 nF 走廊 (x=1624) ⇄ (x=56) 中間棟 nF 走廊 (x=1624) ⇄ (x=56) 右棟 nF 走廊 ── [右棟外牆 x=1680]
```

1. **左棟各層 (`corridor_left_1f`..`5f`)**：
   - 西側 (`x = 0`)：實心校園外牆，不可穿越。
   - 東側 (`x = 1624` 連廊拱門 / `x >= 1638` 邊界自動過門)：進入**中間棟同樓層西側入口** (`targetSpawnX = 140`, `facing = 'right'`)。
2. **中間棟各層 (`corridor_center_1f`..`5f`)**：
   - 西側 (`x = 56` 連廊拱門 / `x <= 42` 邊界自動過門)：進入**左棟同樓層東側入口** (`targetSpawnX = 1540`, `facing = 'left'`)。
   - 東側 (`x = 1624` 連廊拱門 / `x >= 1638` 邊界自動過門)：進入**右棟同樓層西側入口** (`targetSpawnX = 140`, `facing = 'right'`)。
3. **右棟各層 (`corridor_right_1f`..`5f`)**：
   - 西側 (`x = 56` 連廊拱門 / `x <= 42` 邊界自動過門)：進入**中間棟同樓層東側入口** (`targetSpawnX = 1540`, `facing = 'left'`)。
   - 東側 (`x = 1680`)：實心校園外牆，不可穿越。
4. **雙重觸發支援與同層保證**：玩家既可直接走到走廊東西邊界自動切換，也可在跨棟連廊拱門處按 `E` 切換；跨棟移動時樓層 `floor` 永遠保持一致，絕不跳樓層。

---

## 7. 樓梯連通規則 (`CENTER_BUILDING_STAIRWAYS`)

1. **上下樓永遠抵達「公共走廊」**：中間棟 `1F～5F` 內部垂直樓梯（西側樓梯 `x = 310..340`、東側樓梯 `x = 1340..1390`）上下樓後，目標場景永遠是 `corridor_center_1f` ～ `corridor_center_5f`，絕不會直接把玩家送進教務處、圖書館或教室。
2. **與左右跨棟邊界完全分離**：
   - 西側跨棟邊界位於 `x = 56`，西側內部樓梯位於 `x = 310..340`（間距 `>= 254px`）。
   - 東側跨棟邊界位於 `x = 1624`，東側內部樓梯位於 `x = 1340..1390`（間距 `>= 234px`）。
   - 樓梯使用專屬的階梯視覺樣式 (`visualStyle: 'staircase'`)，與跨棟拱門 (`visualStyle: 'corridor_arch'`) 及室內房門完全區隔。

---

## 8. 房門間距與非重疊規則 (`validateCorridorSpacingRules`)

系統內建 `validateCorridorSpacingRules(areaDef)` 自動檢測函式，對全部 15 條公共走廊強制執行以下幾何約束：

1. **同走廊相鄰通道/房門中心距離 `>= 220px`**：所有 `kind === 'portal'` 的物件（跨棟拱門、樓梯、室內房門）中心 X 座標間距均 `>= 234px`（大於規範要求的 `220px`）。
2. **碰撞區 (`width`) 零重疊**：任意兩個互動物件的水平實體範圍 `[x - width/2, x + width/2]` 不重疊。
3. **互動觸發半徑 (`interactionRadius`) 零重疊**：任意兩個互動物件的觸發範圍 `[x - interactionRadius, x + interactionRadius]` 不重疊，確保同時間只會亮起唯一一個 `[E]` 互動提示。
4. **房門視覺分類**：支援 `classroom_door`（教室木門）、`admin_door`（行政胡桃木門）、`infirmary_door`（十字醫療門）、`lab_door`（實驗金屬視窗門）、`dorm_door`（宿舍暖色門）、`locked_door`（銅鎖封條鐵門）、`staircase`（垂直樓梯）、`corridor_arch`（跨棟連廊拱門）。

---

## 9. 地圖與存檔修改說明

### 9.1 雙層結構校園導覽地圖 (`UIScene.ts`)
- **第一層（三棟五層走廊網格）**：地圖 `3×5` 網格的每一格代表該棟該樓層的公共走廊（`corridor_left_1f` ～ `corridor_right_5f`），標示水平跨棟連廊 (`══`) 與中間棟垂直樓梯 (`🪜`)，並區分玩家目前在走廊 (`📍走廊`) 或在附屬房間內 (`📍房內`)。
- **第二層（該樓層附屬房門與探索詳情）**：滑鼠指向或點擊任一走廊格時，底部詳細資訊面板同步顯示：
  - `[第一層·走廊]`：棟別、樓層、走廊探索狀態、東西跨棟連廊目標、中央樓梯方向。
  - `[第二層·房門]`：該走廊上所有室內房門名稱、座標 `x`、門鎖狀態 (`🚪開放` / `🔒上鎖` / `🔓已開鎖`) 與房間探索狀態 (`✓已探索` / `未探索`)。
  - 點擊地圖節點僅檢視資訊，絕不直接傳送角色。

### 9.2 存檔系統擴充與舊版室內存檔遷移 (`SaveManager.ts`)
- **新增 R1 空間狀態欄位**：於 `GameSavePayloadV2`（Schema V3）儲存並還原 `buildingId`、`floorLevel`、`corridorSceneId`、`currentRoomSceneId`、`currentDoorId`、`roomReturnPosition`、`exploredCorridors`、`exploredRooms`、`unlockedDoors`、`unlockedStairs`。
- **舊版室內存檔安全遷移 (`INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE`)**：當載入舊版 Phase 6B / 6B-2 直接存在室內場景（未含 `corridorSceneId`）的存檔時，自動將玩家安全定位至該房間所屬公共走廊的房門正前方，並 100% 保留所有背包物品、線索、證據、任務、日夜時段與 NPC 關係。

---

## 10. 測試與實際遊玩驗收結果

### 10.1 自動化測試結果
- **`npm run typecheck`**：通過（`0 errors`）。
- **`npm test` (Vitest)**：**12 個測試檔案、共 72 項測試全部通過**（含新增 `tests/phase6b2R1CorridorAndRooms.test.ts` 涵蓋 A.走廊網路、B.跨棟邊界、C.房門互動與返回座標、D.15 條走廊間距與零重疊驗證、E.1F～5F 樓梯與邊界分離、F.存檔與舊版遷移）。
- **`npm run build`**：通過（Vite 正式版打包成功）。

### 10.2 瀏覽器 15 項實際遊玩路線驗收
已透過內建瀏覽器於 `http://localhost:5173/` 實機完成全部 15 項動線驗收（Console Errors: `0`）：
1. 從校門 (`school_gate`) 進入中間棟 1F 公共走廊 (`corridor_center_1f`)，並拾取生鏽鑰匙。
2. 由中間棟 1F 向西跨越邊界進入左棟 1F 公共走廊 (`corridor_left_1f`)。
3. 在左棟 1F 走廊走到 `x=680` 按 `E` 進入教師辦公室 (`teachers_office`)，再按 `E` 離開回到左棟 1F 走廊 `x=680`。
4. 向東返回中間棟 1F，再向東跨越邊界進入右棟 1F 公共走廊 (`corridor_right_1f`)。
5. 在右棟 1F 走廊走到 `x=960` 按 `E` 進入保健室 (`infirmary`)，再按 `E` 離開回到右棟 1F 走廊 `x=960`。
6. 返回中間棟 1F，走樓梯上至中間棟 2F 公共走廊 (`corridor_center_2f`)，確認出現於走廊而非直接進教務處。
7. 在中間棟 2F 走廊走到 `x=840` 按 `E` 進入教務處 (`academic_office`)，再離開回到中間棟 2F 走廊。
8. 從中間棟 2F 往左走到左棟 2F 走廊 (`corridor_left_2f`)，使用鑰匙解鎖並進入普通教室 (`classroom`)；往右走到右棟 2F 走廊 (`corridor_right_2f`) 確認學生宿舍門 (`x=960`)。
9. 沿中間棟樓梯逐層測試 3F (`corridor_center_3f`)、4F (`corridor_center_4f`)、5F (`corridor_center_5f`) 走廊、房門間距、雙層地圖 (`M`) 與存檔讀檔，全部正常運作。

---

## 11. 本地遊玩連結

- **本地即時遊玩網址**：http://localhost:5173/
