import { beforeEach, describe, expect, it } from 'vitest';
import { DEFAULT_PLAYER_CONFIG } from '../src/config/playerConfig';
import {
  getAllInteractableDefinitions,
  getAreaDefinition,
} from '../src/data/campusAreas';
import { PlayerController } from '../src/entities/PlayerController';
import { ExplorationStateManager } from '../src/systems/ExplorationStateManager';
import type { AreaId, InputSnapshot } from '../src/types';

function createIdleInput(overrides?: Partial<InputSnapshot>): InputSnapshot {
  return {
    moveLeft: false,
    moveRight: false,
    jumpJustPressed: false,
    attackJustPressed: false,
    blockHeld: false,
    interactJustPressed: false,
    inventoryJustPressed: false,
    pauseJustPressed: false,
    ...overrides,
  };
}

describe('Phase 2 — 校門、走廊、教室、公告欄區域與互動系統測試', () => {
  let manager: ExplorationStateManager;

  beforeEach(() => {
    manager = new ExplorationStateManager('school_gate', 'initial_spawn');
  });

  it('1. 四大區域皆具備獨立邊界與出入口，且所有互動物件擁有全域唯一穩定的識別 ID', () => {
    const areaIds: AreaId[] = [
      'school_gate',
      'bulletin_area',
      'corridor',
      'classroom',
    ];

    for (const id of areaIds) {
      const area = getAreaDefinition(id);
      expect(area).toBeDefined();
      expect(area.bounds.width).toBeGreaterThan(0);
      expect(area.bounds.floorY).toBe(312);
      expect(Object.keys(area.spawns).length).toBeGreaterThan(0);
      expect(area.interactables.length).toBeGreaterThan(0);
    }

    const allInteractables = getAllInteractableDefinitions();
    const idSet = new Set(allInteractables.map((obj) => obj.id));
    expect(idSet.size).toBe(allInteractables.length);
  });

  it('2. 必須實作的互動物件皆存在且可正常觸發對應互動（校門/教室門、公告欄、課桌、黑板、入學通知、失蹤學生海報、神祕校務文件、可拾取物品）', () => {
    const allIds = new Set(getAllInteractableDefinitions().map((o) => o.id));

    // 驗證必備物件存在
    expect(allIds.has('portal_gate_to_corridor')).toBe(true);       // 校門
    expect(allIds.has('portal_corridor_to_classroom')).toBe(true);  // 教室門
    expect(allIds.has('obj_campus_bulletin_board')).toBe(true);     // 公告欄
    expect(allIds.has('obj_classroom_desk')).toBe(true);            // 課桌
    expect(allIds.has('obj_classroom_blackboard')).toBe(true);      // 黑板
    expect(allIds.has('doc_admission_notice')).toBe(true);          // 入學通知
    expect(allIds.has('doc_missing_student_poster')).toBe(true);    // 失蹤學生海報
    expect(allIds.has('doc_mysterious_school_file')).toBe(true);    // 神祕校務文件
    expect(allIds.has('pickup_rusted_classroom_key')).toBe(true);   // 可拿取進背包的物品 1
    expect(allIds.has('pickup_brass_locker_token')).toBe(true);     // 可拿取進背包的物品 2
  });

  it('3. 距離範圍判定與滑鼠點選物件：超出範圍提示走近，進入有效範圍後顯示提示並可按 E 或點擊互動', () => {
    // 玩家在 x = 160，而入學通知在 x = 310 (radius = 68)
    expect(manager.findCandidateInRange(160)).toBeNull();

    // 滑鼠點擊選取遠處的「入學通知」
    const selected = manager.selectObjectByMouse('doc_admission_notice');
    expect(selected?.id).toBe('doc_admission_notice');

    // 在範圍外嘗試互動會被阻擋並回傳 out_of_range
    const outOfRangeRes = manager.interactWithObject('doc_admission_notice', 160);
    expect(outOfRangeRes.success).toBe(false);
    expect(outOfRangeRes.blockedReason).toBe('out_of_range');
    expect(manager.getModalState()).toBe('none');

    // 玩家走近至 x = 290 (|290 - 310| = 20 <= 68)，進入有效範圍
    const candidate = manager.findCandidateInRange(290);
    expect(candidate?.id).toBe('doc_admission_notice');

    // 觸發互動成功開啟文件閱讀 UI
    const inRangeRes = manager.interactWithObject('doc_admission_notice', 290);
    expect(inRangeRes.success).toBe(true);
    expect(inRangeRes.uiState).toBe('document');
    expect(manager.getModalState()).toBe('document');
  });

  it('4. 同一時間只允許一個主要互動操作（當文件或調查視窗開啟時，拒絕其他互動直到關閉）', () => {
    // 先在 x = 300 閱讀入學通知，進入 document 狀態
    const firstRes = manager.interactWithObject('doc_admission_notice', 300);
    expect(firstRes.success).toBe(true);
    expect(manager.getModalState()).toBe('document');

    // 未關閉視窗前，嘗試觸發另一個互動或再次互動，必須被拒絕 (busy)
    const secondRes = manager.interactWithObject('doc_admission_notice', 300);
    expect(secondRes.success).toBe(false);
    expect(secondRes.blockedReason).toBe('busy');

    // 關閉視窗後，即可再次正常互動
    manager.closeModal();
    expect(manager.getModalState()).toBe('none');
    const thirdRes = manager.interactWithObject('doc_admission_notice', 300);
    expect(thirdRes.success).toBe(true);
  });

  it('5. 文件可重複閱讀，但同一條線索絕不重複新增；調查課桌、黑板、公告欄亦同', () => {
    // 第 1 次閱讀入學通知
    const res1 = manager.interactWithObject('doc_admission_notice', 310);
    expect(res1.success).toBe(true);
    expect(res1.newlyAddedClue?.id).toBe('clue_admission_notice');
    expect(manager.getClues().length).toBe(1);
    manager.closeModal();

    // 第 2 次與第 3 次重複閱讀同一份入學通知
    const res2 = manager.interactWithObject('doc_admission_notice', 310);
    expect(res2.success).toBe(true);
    expect(res2.newlyAddedClue).toBeUndefined();
    expect(manager.getClues().length).toBe(1);
    manager.closeModal();

    // 前往公告欄區域調查「公告欄」與閱讀「失蹤學生海報」
    manager.setAreaAndSpawn('bulletin_area', 'from_gate');
    const boardRes1 = manager.interactWithObject('obj_campus_bulletin_board', 340);
    expect(boardRes1.success).toBe(true);
    expect(boardRes1.newlyAddedClue?.id).toBe('clue_bulletin_board_hint');
    expect(manager.getClues().length).toBe(2);
    manager.closeModal();

    // 重複調查公告欄不會新增重複線索
    const boardRes2 = manager.interactWithObject('obj_campus_bulletin_board', 340);
    expect(boardRes2.success).toBe(true);
    expect(boardRes2.newlyAddedClue).toBeUndefined();
    expect(manager.getClues().length).toBe(2);
    manager.closeModal();

    // 閱讀失蹤學生海報
    const posterRes = manager.interactWithObject('doc_missing_student_poster', 490);
    expect(posterRes.success).toBe(true);
    expect(posterRes.newlyAddedClue?.id).toBe('clue_missing_student_poster');
    expect(manager.getClues().length).toBe(3);
    manager.closeModal();
  });

  it('6. 物品拾取與背包管理：已拿取物品進入背包，且在同一存檔中離開再返回場景也不會重複生成', () => {
    manager.setAreaAndSpawn('bulletin_area', 'from_gate');

    // 拾取前該鑰匙在可見清單中
    expect(
      manager
        .getVisibleInteractables('bulletin_area')
        .some((o) => o.id === 'pickup_rusted_classroom_key')
    ).toBe(true);

    // 玩家走近 x = 630 拾取「生鏽的三年丙班鑰匙」
    const pickupRes = manager.interactWithObject('pickup_rusted_classroom_key', 630);
    expect(pickupRes.success).toBe(true);
    expect(pickupRes.acquiredItem?.id).toBe('item_rusted_classroom_key');
    expect(manager.hasItem('item_rusted_classroom_key')).toBe(true);
    expect(manager.getInventoryItems().length).toBe(1);
    manager.closeModal();

    // 拾取後立即從可見清單移除，再次嘗試互動回傳 already_collected
    expect(
      manager
        .getVisibleInteractables('bulletin_area')
        .some((o) => o.id === 'pickup_rusted_classroom_key')
    ).toBe(false);

    const retryPickup = manager.interactWithObject('pickup_rusted_classroom_key', 630);
    expect(retryPickup.success).toBe(false);
    expect(retryPickup.blockedReason).toBe('already_collected');
    expect(manager.getInventoryItems().length).toBe(1);

    // 切換到走廊再切回公告欄區域，驗證已拿取物品不會重複生成
    manager.setAreaAndSpawn('corridor', 'from_bulletin');
    manager.setAreaAndSpawn('bulletin_area', 'from_corridor');
    expect(
      manager
        .getVisibleInteractables('bulletin_area')
        .some((o) => o.id === 'pickup_rusted_classroom_key')
    ).toBe(false);
  });

  it('7. 每個門都能正確切換場景、驗證教室門鑰匙條件、切換後不卡牆或懸空，且玩家移動與戰鬥控制完全正常', () => {
    // (A) 校門 -> 公告欄區域
    expect(manager.getCurrentAreaId()).toBe('school_gate');
    const toBulletin = manager.interactWithObject('portal_gate_to_bulletin', 610);
    expect(toBulletin.success).toBe(true);
    expect(toBulletin.portalTransition?.targetAreaId).toBe('bulletin_area');
    expect(manager.getCurrentAreaId()).toBe('bulletin_area');

    // (B) 公告欄區域 -> 校園走廊
    const toCorridor = manager.interactWithObject('portal_bulletin_to_corridor', 790);
    expect(toCorridor.success).toBe(true);
    expect(manager.getCurrentAreaId()).toBe('corridor');

    // (C) 在走廊調查「走廊歷史沿革碑」(x = 690)
    const corridorPlaqueRes = manager.interactWithObject('obj_corridor_notice_cabinet', 690);
    expect(corridorPlaqueRes.success).toBe(true);
    expect(corridorPlaqueRes.newlyAddedClue?.id).toBe('clue_corridor_history_plaque');
    manager.closeModal();

    // (D) 尚未取得鑰匙前，嘗試開啟走廊盡頭的「三年丙班教室門」(x = 1080) -> 應顯示上鎖
    const lockedRes = manager.interactWithObject('portal_corridor_to_classroom', 1080);
    expect(lockedRes.success).toBe(false);
    expect(lockedRes.blockedReason).toBe('locked');
    expect(manager.getCurrentAreaId()).toBe('corridor');
    manager.closeModal();

    // (E) 返回公告欄拾取鑰匙，再回走廊開啟教室門
    manager.interactWithObject('portal_corridor_to_bulletin', 340);
    expect(manager.getCurrentAreaId()).toBe('bulletin_area');
    manager.interactWithObject('pickup_rusted_classroom_key', 630);
    manager.closeModal();
    manager.interactWithObject('portal_bulletin_to_corridor', 790);
    expect(manager.getCurrentAreaId()).toBe('corridor');

    const unlockRes = manager.interactWithObject('portal_corridor_to_classroom', 1080);
    expect(unlockRes.success).toBe(true);
    expect(unlockRes.portalTransition?.targetAreaId).toBe('classroom');
    expect(manager.getCurrentAreaId()).toBe('classroom');

    // (F) 在教室內調查「課桌」、「神祕校務文件」、「黑板」並拾取「刻有校徽的黃銅名牌」
    const deskRes = manager.interactWithObject('obj_classroom_desk', 310);
    expect(deskRes.success).toBe(true);
    manager.closeModal();

    const tokenRes = manager.interactWithObject('pickup_brass_locker_token', 430);
    expect(tokenRes.success).toBe(true);
    expect(manager.hasItem('item_brass_locker_token')).toBe(true);
    manager.closeModal();

    const schoolFileRes = manager.interactWithObject('doc_mysterious_school_file', 555);
    expect(schoolFileRes.success).toBe(true);
    expect(schoolFileRes.newlyAddedClue?.id).toBe('clue_mysterious_school_file');
    manager.closeModal();

    const blackboardRes = manager.interactWithObject('obj_classroom_blackboard', 710);
    expect(blackboardRes.success).toBe(true);
    expect(blackboardRes.newlyAddedClue?.id).toBe('clue_classroom_blackboard_duty');
    manager.closeModal();

    // (G) 驗證切換場景後的出生座標絕不卡在牆內或懸在半空中，且 PlayerController 移動、跳躍與攻擊完全正常
    const classroomArea = getAreaDefinition('classroom');
    const spawn = manager.getCurrentSpawnLocation(DEFAULT_PLAYER_CONFIG.collider.width);
    const halfW = DEFAULT_PLAYER_CONFIG.collider.width / 2;

    expect(spawn.x).toBeGreaterThanOrEqual(classroomArea.bounds.minX + halfW);
    expect(spawn.x).toBeLessThanOrEqual(classroomArea.bounds.maxX - halfW);
    expect(spawn.y).toBe(classroomArea.bounds.floorY);

    const player = new PlayerController(spawn.x, spawn.y, {
      minX: classroomArea.bounds.minX,
      maxX: classroomArea.bounds.maxX,
      floorY: classroomArea.bounds.floorY,
    });
    player.setSpawnPosition(spawn.x, spawn.y, spawn.facing);

    // 確認切換後落地狀態為 true，不會卡在半空
    expect(player.getSnapshot().isGrounded).toBe(true);

    // 確認切換後可正常向右移動、跳躍與攻擊
    let snap = player.step(100, createIdleInput({ moveRight: true }));
    expect(snap.x).toBeGreaterThan(spawn.x);
    expect(snap.state).toBe('move');

    snap = player.step(16, createIdleInput({ attackJustPressed: true }));
    expect(snap.state).toBe('attack');
    expect(snap.attackPhase).toBe('startup');
  });
});
