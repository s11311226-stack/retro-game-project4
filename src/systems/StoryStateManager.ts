import {
  DEMO_CHAPTER_TITLE,
  DEMO_STORY_EVENTS,
  INITIAL_OBJECTIVE_TEXT,
} from '../data/storyScript';
import type {
  AreaId,
  DialogueLineDef,
  FutureNarrativeMetrics,
  IMultiEndingExtensionHooks,
  StoryEventDef,
  StoryEventId,
  StoryFlagId,
} from '../types';

export interface ActiveStoryDialogueState {
  eventId: StoryEventId;
  chapterTitle: string;
  currentLineIndex: number;
  totalLines: number;
  currentLine: DialogueLineDef;
  presentationEffect: StoryEventDef['presentationEffect'];
}

export const TOTAL_DEMO_CORE_CLUES = 6;

/**
 * 體驗版劇情系統與未來多結局擴充介面管理器 (StoryStateManager)
 *
 * 1. 管理體驗版章節「點名簿上不存在的人」的所有劇情旗標 (`StoryFlagId`) 與已完成事件 (`completedEventIds`)。
 * 2. 事件皆使用明確穩定的 `StoryEventId`，絕不依賴場景 X/Y 座標，且場景重載時絕不重複觸發。
 * 3. 支援逐句推進對話演出，演出結束後交還玩家控制權。
 * 4. 當玩家完成「失蹤學生海報」與「教室神祕校務文件」調查並關閉視窗後，觸發畫面閃爍與「新生已完成觀察」神祕訊息事件，最後引導進入體驗版通關畫面。
 * 5. 實作 `IMultiEndingExtensionHooks` 預留未來正式版的證據完整度、角色好感度、財閥警戒度與多結局評估介面（不在本體驗版過度實作多結局內容）。
 */
export class StoryStateManager implements IMultiEndingExtensionHooks {
  private flags = new Set<StoryFlagId>();
  private completedEventIds = new Set<StoryEventId>();

  private activeEvent: StoryEventDef | null = null;
  private activeLineIndex = 0;
  private currentObjectiveText = INITIAL_OBJECTIVE_TEXT;

  private metrics: FutureNarrativeMetrics = {
    evidenceCompleteness: 0,
    affectionScores: {},
    conglomerateAlertLevel: 0,
  };

  public resetStoryState(): void {
    this.flags.clear();
    this.completedEventIds.clear();
    this.activeEvent = null;
    this.activeLineIndex = 0;
    this.currentObjectiveText = INITIAL_OBJECTIVE_TEXT;
    this.metrics = {
      evidenceCompleteness: 0,
      affectionScores: {},
      conglomerateAlertLevel: 0,
    };
  }

  public getChapterTitle(): string {
    return DEMO_CHAPTER_TITLE;
  }

  public getCurrentObjective(): string {
    return this.currentObjectiveText;
  }

  public hasFlag(flag: StoryFlagId): boolean {
    return this.flags.has(flag);
  }

  public setFlag(flag: StoryFlagId): void {
    this.flags.add(flag);
  }

  public getFlags(): StoryFlagId[] {
    return Array.from(this.flags);
  }

  public isEventCompleted(eventId: StoryEventId): boolean {
    return this.completedEventIds.has(eventId);
  }

  public getCompletedEventIds(): StoryEventId[] {
    return Array.from(this.completedEventIds);
  }

  /**
   * 從經驗證的存檔快照還原劇情旗標與事件進度
   */
  public restoreFromSaveData(payload: {
    flags: StoryFlagId[];
    completedEventIds: StoryEventId[];
    currentObjectiveText: string;
    metrics: FutureNarrativeMetrics;
  }): void {
    this.flags = new Set(payload.flags);
    this.completedEventIds = new Set(payload.completedEventIds);
    this.activeEvent = null;
    this.activeLineIndex = 0;
    this.currentObjectiveText =
      payload.currentObjectiveText || INITIAL_OBJECTIVE_TEXT;
    this.metrics = {
      evidenceCompleteness: payload.metrics.evidenceCompleteness ?? 0,
      affectionScores: { ...(payload.metrics.affectionScores ?? {}) },
      conglomerateAlertLevel: payload.metrics.conglomerateAlertLevel ?? 0,
    };
  }

  public isDialogueActive(): boolean {
    return this.activeEvent !== null;
  }

  public getActiveDialogueState(): ActiveStoryDialogueState | null {
    if (!this.activeEvent) return null;
    const line = this.activeEvent.dialogueLines[this.activeLineIndex];
    if (!line) return null;

    return {
      eventId: this.activeEvent.id,
      chapterTitle: this.activeEvent.chapterTitle,
      currentLineIndex: this.activeLineIndex,
      totalLines: this.activeEvent.dialogueLines.length,
      currentLine: line,
      presentationEffect: this.activeEvent.presentationEffect ?? 'none',
    };
  }

  /**
   * 當與特定物件互動或閱讀文件時，自動更新對應劇情旗標與未來擴充指標
   */
  public notifyObjectInteracted(objectId: string, totalCluesCount: number): void {
    switch (objectId) {
      case 'doc_admission_notice':
        this.setFlag('flag_admission_notice_read');
        break;
      case 'obj_campus_bulletin_board':
        this.setFlag('flag_roster_mismatch_checked');
        break;
      case 'doc_missing_student_poster':
        this.setFlag('flag_missing_poster_found');
        if (!this.hasFlag('flag_anachronistic_file_read')) {
          this.currentObjectiveText =
            '目標：已發現失蹤學生海報！拾取長椅下的教室鑰匙，前往走廊盡頭的「三年丙班教室」調查校務文件。';
        }
        break;
      case 'pickup_rusted_classroom_key':
        this.setFlag('flag_classroom_key_obtained');
        break;
      case 'doc_mysterious_school_file':
        this.setFlag('flag_anachronistic_file_read');
        break;
    }

    this.recordEvidenceProgress(totalCluesCount, TOTAL_DEMO_CORE_CLUES);
  }

  /**
   * 檢查進入某區域時是否有應觸發的劇情演出（如開始時的入學演出、首次進入三年丙班教室演出）
   * 依靠 `completedEventIds` 與 `StoryFlagId` 避免重載或往返場景時重複觸發。
   */
  public checkAreaEnterTriggers(areaId: AreaId): ActiveStoryDialogueState | null {
    if (this.activeEvent) {
      return this.getActiveDialogueState();
    }

    if (areaId === 'classroom') {
      this.setFlag('flag_classroom_entered');
    }

    for (const event of Object.values(DEMO_STORY_EVENTS)) {
      if (event.triggerCondition.triggerOnAreaEnter !== areaId) continue;
      if (this.canTriggerEvent(event)) {
        return this.startEvent(event);
      }
    }

    return null;
  }

  /**
   * 檢查當玩家關閉某個調查或文件閱讀視窗後，是否觸發後續劇情演出
   * （例如：讀完失蹤學生海報、或讀完教室內的 1998 年神祕校務文件後觸發「新生已完成觀察」閃爍演出）
   *
   * 特別防軟鎖設計：若玩家先去教室讀了神祕校務文件，後去公告欄讀失蹤學生海報（或反之），
   * 只要兩項核心條件 (`flag_missing_poster_found` + `flag_anachronistic_file_read`) 均已達成，
   * 在關閉其中最後一項文件視窗時都能穩定觸發 `evt_anomaly_new_student_observed`，絕不軟鎖！
   */
  public checkAfterObjectModalClosed(
    closedObjectId: string
  ): ActiveStoryDialogueState | null {
    if (this.activeEvent) {
      return this.getActiveDialogueState();
    }

    // 優先檢查核心結尾異變事件：只要已發現海報 + 已閱讀教室神祕文件，且剛關閉這兩者之一即可觸發
    const anomalyEvent = DEMO_STORY_EVENTS.evt_anomaly_new_student_observed;
    if (
      (closedObjectId === 'doc_mysterious_school_file' ||
        closedObjectId === 'doc_missing_student_poster') &&
      this.canTriggerEvent(anomalyEvent)
    ) {
      // 觸發異變時同步提升財閥警戒度預留指標
      this.adjustConglomerateAlert(50);
      return this.startEvent(anomalyEvent);
    }

    // 檢查其他一般物件關閉後觸發的獨白事件
    for (const event of Object.values(DEMO_STORY_EVENTS)) {
      if (event.id === 'evt_anomaly_new_student_observed') continue;
      if (event.triggerCondition.triggerAfterObjectClosed !== closedObjectId) {
        continue;
      }
      if (this.canTriggerEvent(event)) {
        return this.startEvent(event);
      }
    }

    return null;
  }

  /**
   * 推進當前對話至下一句；若已無下一句則完成該事件並回傳完成狀態
   */
  public advanceDialogue(): {
    dialogueState: ActiveStoryDialogueState | null;
    completedEvent: StoryEventDef | null;
    shouldEnterDemoEnding: boolean;
  } {
    if (!this.activeEvent) {
      return {
        dialogueState: null,
        completedEvent: null,
        shouldEnterDemoEnding: false,
      };
    }

    this.activeLineIndex += 1;

    if (this.activeLineIndex < this.activeEvent.dialogueLines.length) {
      return {
        dialogueState: this.getActiveDialogueState(),
        completedEvent: null,
        shouldEnterDemoEnding: false,
      };
    }

    // 對話全部播放完畢，寫入完成 ID 與旗標
    const finishedEvent = this.activeEvent;
    this.completedEventIds.add(finishedEvent.id);
    for (const flag of finishedEvent.setFlagsOnComplete) {
      this.flags.add(flag);
    }
    if (finishedEvent.nextObjectiveText) {
      this.currentObjectiveText = finishedEvent.nextObjectiveText;
    }

    this.activeEvent = null;
    this.activeLineIndex = 0;

    const shouldEnterDemoEnding =
      finishedEvent.id === 'evt_anomaly_new_student_observed' &&
      this.hasFlag('flag_demo_completed');

    if (shouldEnterDemoEnding) {
      this.completedEventIds.add('evt_demo_ending_complete');
    }

    return {
      dialogueState: null,
      completedEvent: finishedEvent,
      shouldEnterDemoEnding,
    };
  }

  private canTriggerEvent(event: StoryEventDef): boolean {
    if (this.completedEventIds.has(event.id)) {
      return false;
    }
    const { requiredFlags, forbiddenFlags } = event.triggerCondition;
    for (const req of requiredFlags) {
      if (!this.flags.has(req)) return false;
    }
    if (forbiddenFlags) {
      for (const forb of forbiddenFlags) {
        if (this.flags.has(forb)) return false;
      }
    }
    return true;
  }

  private startEvent(event: StoryEventDef): ActiveStoryDialogueState | null {
    if (event.dialogueLines.length === 0) {
      this.completedEventIds.add(event.id);
      event.setFlagsOnComplete.forEach((f) => this.flags.add(f));
      return null;
    }
    this.activeEvent = event;
    this.activeLineIndex = 0;
    return this.getActiveDialogueState();
  }

  // ==========================================================================
  // IMultiEndingExtensionHooks — 為未來正式版預留的擴充介面實作
  // ==========================================================================

  public getMetrics(): FutureNarrativeMetrics {
    return {
      evidenceCompleteness: this.metrics.evidenceCompleteness,
      affectionScores: { ...this.metrics.affectionScores },
      conglomerateAlertLevel: this.metrics.conglomerateAlertLevel,
    };
  }

  public recordEvidenceProgress(
    clueCount: number,
    totalDemoClues: number = TOTAL_DEMO_CORE_CLUES
  ): void {
    const ratio = totalDemoClues > 0 ? clueCount / totalDemoClues : 0;
    this.metrics.evidenceCompleteness = Math.min(
      100,
      Math.round(ratio * 100)
    );
  }

  public adjustAffection(npcId: string, delta: number): void {
    const current = this.metrics.affectionScores[npcId] ?? 0;
    this.metrics.affectionScores[npcId] = current + delta;
  }

  public adjustConglomerateAlert(delta: number): void {
    this.metrics.conglomerateAlertLevel = Math.max(
      0,
      Math.min(100, this.metrics.conglomerateAlertLevel + delta)
    );
  }

  /**
   * 預留未來多結局判定介面；在 Phase 3 體驗版中固定回傳單一結局 ID
   */
  public resolveEndingRouteId(): string {
    return 'demo_single_ending_observed';
  }
}

export const globalStoryState = new StoryStateManager();
