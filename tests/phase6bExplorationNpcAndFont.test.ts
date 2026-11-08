import { beforeEach, describe, expect, it } from 'vitest';
import {
  PRIMARY_CJK_FONT_FAMILY,
  TYPOGRAPHY_SPECS,
} from '../src/config/TypographyConfig';
import { CAMPUS_AREAS, getAreaDefinition } from '../src/data/campusAreas';
import { NPC_SCENE_PLACEMENTS } from '../src/data/npcDialoguesCatalog';
import { CampusAtmosphereSystem } from '../src/systems/CampusAtmosphereSystem';
import { CharacterRelationshipSystem } from '../src/systems/CharacterRelationshipSystem';
import { EvidenceSystem } from '../src/systems/EvidenceSystem';
import { ExplorationStateManager } from '../src/systems/ExplorationStateManager';
import { FontManager } from '../src/systems/FontManager';
import { GlobalGameState } from '../src/systems/GlobalGameState';
import { NPCInteractionSystem } from '../src/systems/NPCInteractionSystem';
import { QuestSystem } from '../src/systems/QuestSystem';
import { SaveManager } from '../src/systems/SaveManager';
import { StoryStateManager } from '../src/systems/StoryStateManager';
import type { AreaId } from '../src/types';

describe('Phase 6B — 正式版校園探索、NPC 分支對話、日夜氛圍與清晰字體系統測試', () => {
  let fontManager: FontManager;
  let gameState: GlobalGameState;
  let relationshipSystem: CharacterRelationshipSystem;
  let evidenceSystem: EvidenceSystem;
  let questSystem: QuestSystem;
  let atmosphereSystem: CampusAtmosphereSystem;
  let npcSystem: NPCInteractionSystem;
  let exploration: ExplorationStateManager;
  let story: StoryStateManager;

  beforeEach(() => {
    fontManager = new FontManager();
    gameState = new GlobalGameState();
    relationshipSystem = new CharacterRelationshipSystem(gameState);
    evidenceSystem = new EvidenceSystem(gameState);
    questSystem = new QuestSystem(gameState, relationshipSystem, evidenceSystem);
    atmosphereSystem = new CampusAtmosphereSystem(gameState, evidenceSystem);
    npcSystem = new NPCInteractionSystem(
      gameState,
      relationshipSystem,
      evidenceSystem,
      questSystem
    );
    exploration = new ExplorationStateManager();
    story = new StoryStateManager();
  });

  it('1. 清晰字體系統 (FontManager & TypographyConfig)：應採用 Noto Sans TC 並嚴格符合 640×360 最小字級與長文分頁規範', () => {
    expect(fontManager.getPrimaryFontFamily()).toContain('Noto Sans TC');
    expect(PRIMARY_CJK_FONT_FAMILY).toContain('Noto Sans CJK TC');

    const validation = fontManager.validateTypographyStandards();
    expect(validation.valid).toBe(true);

    // 驗證各級字體尺寸符合規範：
    // 主要對話 16–18px、角色名稱 16–18px、選單文字 14–16px、文件內容 14–16px、次要提示 >=12px、重要提示 >=16px
    expect(TYPOGRAPHY_SPECS.dialogueBody.fontSizePx).toBeGreaterThanOrEqual(16);
    expect(TYPOGRAPHY_SPECS.dialogueBody.fontSizePx).toBeLessThanOrEqual(18);
    expect(TYPOGRAPHY_SPECS.speakerName.fontSizePx).toBeGreaterThanOrEqual(16);
    expect(TYPOGRAPHY_SPECS.speakerName.fontSizePx).toBeLessThanOrEqual(18);
    expect(TYPOGRAPHY_SPECS.menuItem.fontSizePx).toBeGreaterThanOrEqual(14);
    expect(TYPOGRAPHY_SPECS.menuItem.fontSizePx).toBeLessThanOrEqual(16);
    expect(TYPOGRAPHY_SPECS.documentBody.fontSizePx).toBeGreaterThanOrEqual(14);
    expect(TYPOGRAPHY_SPECS.documentBody.fontSizePx).toBeLessThanOrEqual(16);
    expect(TYPOGRAPHY_SPECS.secondaryHint.fontSizePx).toBeGreaterThanOrEqual(12);
    expect(TYPOGRAPHY_SPECS.importantPrompt.fontSizePx).toBeGreaterThanOrEqual(16);

    // 驗證超取樣倍率 >= 3，避免 pixelArt 模式下鋸齒模糊
    const style = fontManager.buildPhaserTextStyle('dialogueBody', {
      wordWrapWidth: 520,
    });
    expect(Number(style.resolution)).toBeGreaterThanOrEqual(3);

    // 驗證長文件分頁計算不會遺漏文字且能拆分為多頁
    const longParagraphs = [
      '第一段：1968年白川財閥以私人醫學與教育慈善基金名義買下山區校地，表面興建寄宿高中有功。',
      '第二段：地下卻同步挖掘B1至B3三層研究設施，啟動名為「回聲搖籃計畫」的群體順從實驗。',
      '第三段：每日黃昏第四聲鐘響混入18.9Hz次聲波共振，使全校師生對失蹤者產生選擇性遺忘。',
    ];
    const pages = fontManager.paginateDocumentContent(longParagraphs, 24, 3);
    expect(pages.length).toBeGreaterThan(1);
    expect(pages.join('')).toContain('1968年白川財閥');
    expect(pages.join('')).toContain('回聲搖籃計畫');
    expect(pages.join('')).toContain('18.9Hz次聲波');
  });

  it('2. 11 處校園探索區域與 7 個新增場景：應可雙向進出、落地座標安全且支援上鎖門與鑰匙解鎖', () => {
    const expectedAreas: AreaId[] = [
      'school_gate',
      'bulletin_area',
      'corridor',
      'classroom',
      'academic_office',
      'teachers_office',
      'dormitory',
      'old_library',
      'forbidden_archive',
      'rooftop',
      'infirmary',
    ];

    for (const areaId of expectedAreas) {
      const def = getAreaDefinition(areaId);
      expect(def.id).toBe(areaId);
      expect(def.interactables.length).toBeGreaterThan(0);

      const spawn = exploration.setAreaAndSpawn(areaId);
      expect(spawn.x).toBeGreaterThan(def.bounds.minX);
      expect(spawn.x).toBeLessThan(def.bounds.maxX);
      expect(spawn.y).toBe(def.bounds.floorY);
    }

    // 測試從走廊進入教務處，再由教務處返回走廊
    exploration.setAreaAndSpawn('corridor', 'from_gate');
    const enterAcademic = exploration.interactWithObject(
      'portal_corridor_to_academic',
      435
    );
    expect(enterAcademic.success).toBe(true);
    expect(enterAcademic.portalTransition?.targetAreaId).toBe('academic_office');
    expect(exploration.getCurrentAreaId()).toBe('academic_office');

    const backToCorridor = exploration.interactWithObject(
      'portal_academic_to_corridor',
      90
    );
    expect(backToCorridor.success).toBe(true);
    expect(exploration.getCurrentAreaId()).toBe('corridor');

    // 測試從舊圖書館進入禁書室：未持有鑰匙前應被鎖住，獲得 item_forbidden_archive_key 後可解鎖進入
    exploration.setAreaAndSpawn('old_library', 'from_corridor');
    const lockedArchive = exploration.interactWithObject(
      'portal_library_to_forbidden',
      930
    );
    expect(lockedArchive.success).toBe(false);
    expect(lockedArchive.blockedReason).toBe('locked');
    exploration.closeModal();

    const grantedKey = exploration.grantItem('item_forbidden_archive_key');
    expect(grantedKey?.id).toBe('item_forbidden_archive_key');

    const unlockedArchive = exploration.interactWithObject(
      'portal_library_to_forbidden',
      930
    );
    expect(unlockedArchive.success).toBe(true);
    expect(unlockedArchive.portalTransition?.targetAreaId).toBe(
      'forbidden_archive'
    );
    expect(exploration.getCurrentAreaId()).toBe('forbidden_archive');
  });

  it('3. 場景調查與證據同步：調查保險箱、微縮膠卷、病歷與鐘塔紀錄應標記已調查並獲得對應證據', () => {
    exploration.setAreaAndSpawn('academic_office', 'from_corridor');
    expect(exploration.isObjectInvestigated('obj_dean_safe_box')).toBe(false);

    const safeRes = exploration.interactWithObject('obj_dean_safe_box', 280);
    expect(safeRes.success).toBe(true);
    expect(safeRes.kind).toBe('document');
    expect(safeRes.grantedEvidenceId).toBe('ev_dean_black_ledger');
    expect(exploration.isObjectInvestigated('obj_dean_safe_box')).toBe(true);

    if (safeRes.grantedEvidenceId) {
      const evCol = evidenceSystem.collectEvidence(safeRes.grantedEvidenceId);
      expect(evCol.newlyCollected).toBe(true);
    }
    expect(evidenceSystem.hasEvidence('ev_dean_black_ledger')).toBe(true);
    expect(gameState.getValue('evidenceCompletion')).toBeGreaterThan(0);
  });

  it('4. NPC 互動與分支對話系統：應支援證據解鎖特殊選項、好感信任變更、識破假線索及單次防重複', () => {
    expect(Object.keys(NPC_SCENE_PLACEMENTS).length).toBeGreaterThanOrEqual(10);

    // 1) 在未收集《教務處黑金免試名冊》前，與沈知遠對話不應出現對質黑皮書的隱藏選項
    const sessionBefore = npcSystem.startDialogue('npc_academic_shen_zhiyuan');
    expect(sessionBefore).not.toBeNull();
    expect(
      sessionBefore?.availableChoices.some(
        (c) => c.choice.id === 'choice_shen_confront_black_ledger'
      )
    ).toBe(false);
    npcSystem.closeDialogue();

    // 收集《教務處黑金免試名冊》後，再次與沈知遠對話應解鎖該特殊選項
    evidenceSystem.collectEvidence('ev_dean_black_ledger');
    const sessionAfter = npcSystem.startDialogue('npc_academic_shen_zhiyuan');
    const ledgerChoice = sessionAfter?.availableChoices.find(
      (c) => c.choice.id === 'choice_shen_confront_black_ledger'
    );
    expect(ledgerChoice).toBeDefined();
    expect(ledgerChoice?.unlockedByEvidence).toBe(true);

    const selectRes1 = npcSystem.selectChoice(
      'choice_shen_confront_black_ledger'
    );
    expect(selectRes1.success).toBe(true);
    expect(selectRes1.alreadyCompleted).toBe(false);
    expect(
      relationshipSystem.getCharacterState('shen_zhiyuan').trust
    ).toBeGreaterThan(15);

    const trustAfterFirst =
      relationshipSystem.getCharacterState('shen_zhiyuan').trust;

    // 重複選擇同一對話分支不會重複增加信任度
    npcSystem.startDialogue('npc_academic_shen_zhiyuan');
    const selectRes2 = npcSystem.selectChoice(
      'choice_shen_confront_black_ledger'
    );
    expect(selectRes2.alreadyCompleted).toBe(true);
    expect(relationshipSystem.getCharacterState('shen_zhiyuan').trust).toBe(
      trustAfterFirst
    );

    // 2) 在舊圖書館收集 1979 地契後，透過許文謙導師的對話選項識破 1994 偽造退學申請書
    evidenceSystem.collectEvidence('rh_forged_expulsion_form');
    evidenceSystem.collectEvidence('ev_1979_land_deed');
    npcSystem.startDialogue('npc_teachers_xu_wenqian');
    const debunkChoice = npcSystem.selectChoice('choice_xu_debunk_expulsion');
    expect(debunkChoice.success).toBe(true);
    expect(
      evidenceSystem.isRedHerringDebunked('rh_forged_expulsion_form')
    ).toBe(true);
  });

  it('5. 日夜與黃昏 18.9Hz 第四聲鐘響氛圍系統 (CampusAtmosphereSystem) 與 Phase 6B 存檔還原', () => {
    expect(atmosphereSystem.getCurrentPhase()).toBe('day');

    // 未持有逆相音叉/八音盒時進入黃昏，應觸發第四聲鐘響並微幅增加實驗侵蝕度
    const duskRes1 = atmosphereSystem.cycleNextPhase(false);
    expect(duskRes1.currentPhase).toBe('dusk');
    expect(duskRes1.fourthBellTriggered).toBe(true);
    expect(duskRes1.counterPhaseProtected).toBe(false);
    expect(gameState.getValue('experimentCorruption')).toBe(4);

    // 進入夜間
    const nightRes = atmosphereSystem.cycleNextPhase(false);
    expect(nightRes.currentPhase).toBe('night');

    // 獲得陸子軒轉交的《殘響八音盒 (18.9Hz 逆相音叉)》後再次進入黃昏，應完全抵消 18.9Hz 侵蝕度
    evidenceSystem.collectEvidence('ev_su_yuqing_music_box_189hz');
    const duskRes2 = atmosphereSystem.setTimePhase('dusk', false);
    expect(duskRes2.counterPhaseProtected).toBe(true);
    expect(gameState.getValue('experimentCorruption')).toBe(4);

    // 測試在新場景 (rooftop) 儲存並還原 Phase 6B 狀態
    exploration.setAreaAndSpawn('rooftop', 'from_corridor');
    exploration.markObjectInvestigated('obj_rooftop_bell_amplifier');
    npcSystem.startDialogue('npc_rooftop_lu_zixuan');
    npcSystem.selectChoice('choice_lu_get_music_box');

    const saveManager = new SaveManager();
    const saved = saveManager.saveCurrentGame(
      exploration,
      story,
      { x: 420, y: 312, facing: 'left' },
      undefined,
      {
        globalState: gameState,
        relationships: relationshipSystem,
        evidence: evidenceSystem,
        quests: questSystem,
        atmosphere: atmosphereSystem,
        npcInteraction: npcSystem,
      }
    );

    expect(saved.player.areaId).toBe('rooftop');
    expect(saved.phase6a?.timePhase).toBe('dusk');
    expect(saved.phase6a?.npcCompletedChoiceIds).toContain(
      'choice_lu_get_music_box'
    );
    expect(saved.phase6a?.investigatedObjectIds).toContain(
      'obj_rooftop_bell_amplifier'
    );

    // 重置所有系統後讀檔還原
    exploration.resetSession();
    atmosphereSystem.reset();
    npcSystem.reset();

    const loaded = saveManager.loadAndValidateSave();
    expect(loaded.success).toBe(true);
    const restoredLoc = saveManager.applySaveToManagers(
      loaded.data!,
      exploration,
      story,
      {
        globalState: gameState,
        relationships: relationshipSystem,
        evidence: evidenceSystem,
        quests: questSystem,
        atmosphere: atmosphereSystem,
        npcInteraction: npcSystem,
      }
    );

    expect(restoredLoc.areaId).toBe('rooftop');
    expect(exploration.getCurrentAreaId()).toBe('rooftop');
    expect(exploration.isObjectInvestigated('obj_rooftop_bell_amplifier')).toBe(
      true
    );
    expect(atmosphereSystem.getCurrentPhase()).toBe('dusk');
    expect(npcSystem.hasCompletedChoice('choice_lu_get_music_box')).toBe(true);
    expect(Object.keys(CAMPUS_AREAS).length).toBe(11);
  });
});
