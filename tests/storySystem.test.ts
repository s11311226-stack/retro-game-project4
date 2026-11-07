import { beforeEach, describe, expect, it } from 'vitest';
import { DEMO_CHAPTER_TITLE } from '../src/data/storyScript';
import { ExplorationStateManager } from '../src/systems/ExplorationStateManager';
import { StoryStateManager } from '../src/systems/StoryStateManager';

describe('Phase 3 — 體驗版短篇劇情「點名簿上不存在的人」與通關流程測試', () => {
  let exploration: ExplorationStateManager;
  let story: StoryStateManager;

  beforeEach(() => {
    exploration = new ExplorationStateManager('school_gate', 'initial_spawn');
    story = new StoryStateManager();
  });

  it('1. 開始時於校門觸發簡短入學演出，演出結束後交還玩家控制權，且重載或往返校門不會重複觸發', () => {
    expect(story.getChapterTitle()).toBe(DEMO_CHAPTER_TITLE);

    // 首次進入 school_gate 觸發開場入學演出
    const introDialogue = story.checkAreaEnterTriggers('school_gate');
    expect(introDialogue).not.toBeNull();
    expect(introDialogue?.eventId).toBe('evt_chapter1_opening_intro');
    expect(story.isDialogueActive()).toBe(true);

    // 逐句推進直到演出結束
    while (story.isDialogueActive()) {
      story.advanceDialogue();
    }

    expect(story.hasFlag('flag_intro_played')).toBe(true);
    expect(story.isEventCompleted('evt_chapter1_opening_intro')).toBe(true);
    expect(story.isDialogueActive()).toBe(false);

    // 場景重載或從其他區域返回校門，絕不重複觸發入學演出
    const reEnterDialogue = story.checkAreaEnterTriggers('school_gate');
    expect(reEnterDialogue).toBeNull();
  });

  it('2. 完整體驗版通關流程：校門 -> 公告欄失蹤學生海報 -> 拿鑰匙進教室 -> 調查早於建校日期的校務文件 -> 觸發閃爍與「新生已完成觀察」 -> 進入通關畫面並可重新開始', () => {
    // Step 1: 完成校門入學演出
    story.checkAreaEnterTriggers('school_gate');
    while (story.isDialogueActive()) {
      story.advanceDialogue();
    }

    // 閱讀校門入學通知 (可閱讀、關閉、重新查看)
    const admissionRes = exploration.interactWithObject('doc_admission_notice', 310);
    expect(admissionRes.success).toBe(true);
    story.notifyObjectInteracted(
      'doc_admission_notice',
      exploration.getClues().length
    );
    exploration.closeModal();
    expect(story.hasFlag('flag_admission_notice_read')).toBe(true);

    // Step 2: 前往公告欄區域，調查公告欄與失蹤學生海報
    exploration.interactWithObject('portal_gate_to_bulletin', 610);
    expect(exploration.getCurrentAreaId()).toBe('bulletin_area');

    const posterRes = exploration.interactWithObject(
      'doc_missing_student_poster',
      490
    );
    expect(posterRes.success).toBe(true);
    story.notifyObjectInteracted(
      'doc_missing_student_poster',
      exploration.getClues().length
    );
    expect(story.hasFlag('flag_missing_poster_found')).toBe(true);

    // 關閉失蹤學生海報視窗，觸發主角發現名字不在名冊上的劇情獨白
    exploration.closeModal();
    const posterDialogue = story.checkAfterObjectModalClosed(
      'doc_missing_student_poster'
    );
    expect(posterDialogue?.eventId).toBe('evt_bulletin_poster_reflection');
    while (story.isDialogueActive()) {
      story.advanceDialogue();
    }

    // 重複閱讀失蹤學生海報並關閉，不會重複觸發獨白事件，也不會重複新增線索
    const clueCountBeforeReRead = exploration.getClues().length;
    exploration.interactWithObject('doc_missing_student_poster', 490);
    exploration.closeModal();
    expect(exploration.getClues().length).toBe(clueCountBeforeReRead);
    expect(
      story.checkAfterObjectModalClosed('doc_missing_student_poster')
    ).toBeNull();

    // Step 3: 拾取三年丙班鑰匙，前往走廊並開啟教室門
    exploration.interactWithObject('pickup_rusted_classroom_key', 630);
    story.notifyObjectInteracted(
      'pickup_rusted_classroom_key',
      exploration.getClues().length
    );
    exploration.closeModal();

    exploration.interactWithObject('portal_bulletin_to_corridor', 790);
    exploration.interactWithObject('portal_corridor_to_classroom', 1080);
    expect(exploration.getCurrentAreaId()).toBe('classroom');

    // 首次進入教室觸發簡短觀察演出
    const classroomIntro = story.checkAreaEnterTriggers('classroom');
    expect(classroomIntro?.eventId).toBe('evt_classroom_entry_reflection');
    while (story.isDialogueActive()) {
      story.advanceDialogue();
    }

    // Step 4: 在教室閱讀早於建校日期（1998 年 vs 2004 年）且列有不在名冊學生的「神祕校務文件」
    const fileRes = exploration.interactWithObject(
      'doc_mysterious_school_file',
      555
    );
    expect(fileRes.success).toBe(true);
    expect(fileRes.document?.subtitle).toContain('1998');
    expect(fileRes.document?.mutatedBanner).toContain('新生已完成觀察');
    story.notifyObjectInteracted(
      'doc_mysterious_school_file',
      exploration.getClues().length
    );
    expect(story.hasFlag('flag_anachronistic_file_read')).toBe(true);

    // 關閉文件視窗後，觸發畫面閃爍與「新生已完成觀察」神祕訊息演出
    exploration.closeModal();
    const anomalyDialogue = story.checkAfterObjectModalClosed(
      'doc_mysterious_school_file'
    );
    expect(anomalyDialogue).not.toBeNull();
    expect(anomalyDialogue?.eventId).toBe('evt_anomaly_new_student_observed');
    expect(anomalyDialogue?.presentationEffect).toBe('screen_flicker_anomaly');

    // 驗證對話中包含「新生已完成觀察」訊息，且推進完畢後回傳 shouldEnterDemoEnding = true
    let sawObservedMessage = false;
    let enteredEnding = false;
    while (story.isDialogueActive()) {
      const current = story.getActiveDialogueState();
      if (current?.currentLine.text.includes('新生已完成觀察')) {
        sawObservedMessage = true;
      }
      const stepResult = story.advanceDialogue();
      if (stepResult.shouldEnterDemoEnding) {
        enteredEnding = true;
      }
    }

    expect(sawObservedMessage).toBe(true);
    expect(enteredEnding).toBe(true);
    expect(story.hasFlag('flag_demo_completed')).toBe(true);

    // Step 5: 驗證重新開始體驗版後，所有旗標、背包、線索與初始區域皆乾淨重置
    exploration.resetSession('school_gate', 'initial_spawn');
    story.resetStoryState();

    expect(exploration.getCurrentAreaId()).toBe('school_gate');
    expect(exploration.getInventoryItems().length).toBe(0);
    expect(exploration.getClues().length).toBe(0);
    expect(story.getFlags().length).toBe(0);
    expect(story.isEventCompleted('evt_chapter1_opening_intro')).toBe(false);

    // 重開後可再次正常觸發入學演出
    expect(story.checkAreaEnterTriggers('school_gate')?.eventId).toBe(
      'evt_chapter1_opening_intro'
    );
  });

  it('3. 防軟鎖驗證：若玩家先拿鑰匙進教室閱讀神祕校務文件，之後才返回公告欄閱讀失蹤學生海報，依然能正常觸發結尾異變與通關畫面', () => {
    // 玩家跳過海報，先拿鑰匙進教室讀文件
    story.notifyObjectInteracted('pickup_rusted_classroom_key', 0);
    story.notifyObjectInteracted('doc_mysterious_school_file', 1);
    expect(story.hasFlag('flag_anachronistic_file_read')).toBe(true);
    expect(story.hasFlag('flag_missing_poster_found')).toBe(false);

    // 此時尚未看過失蹤海報，關閉教室文件不會提前觸發結尾
    expect(
      story.checkAfterObjectModalClosed('doc_mysterious_school_file')
    ).toBeNull();

    // 玩家隨後回到公告欄補讀「失蹤學生海報」並關閉視窗 -> 立即觸發結尾異變，絕不軟鎖
    story.notifyObjectInteracted('doc_missing_student_poster', 2);
    const anomalyDialogue = story.checkAfterObjectModalClosed(
      'doc_missing_student_poster'
    );
    expect(anomalyDialogue?.eventId).toBe('evt_anomaly_new_student_observed');
  });

  it('4. 預留未來正式版擴充介面驗證（證據完整度、好感度、財閥警戒度、多結局評估）', () => {
    story.recordEvidenceProgress(3, 6);
    story.adjustAffection('npc_class_rep', 15);
    story.adjustConglomerateAlert(30);

    const metrics = story.getMetrics();
    expect(metrics.evidenceCompleteness).toBe(50);
    expect(metrics.affectionScores.npc_class_rep).toBe(15);
    expect(metrics.conglomerateAlertLevel).toBe(30);
    expect(story.resolveEndingRouteId()).toBe('demo_single_ending_observed');
  });
});
