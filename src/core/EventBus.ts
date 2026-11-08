type EventCallback<T = unknown> = (payload: T) => void;

export class EventBus {
  private listeners = new Map<string, Set<EventCallback<any>>>();

  public on<T = unknown>(event: string, callback: EventCallback<T>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);
    return () => this.off(event, callback);
  }

  public off<T = unknown>(event: string, callback: EventCallback<T>): void {
    this.listeners.get(event)?.delete(callback);
  }

  public emit<T = unknown>(event: string, payload?: T): void {
    const callbacks = this.listeners.get(event);
    if (!callbacks) return;
    for (const cb of callbacks) {
      cb(payload);
    }
  }

  public clear(): void {
    this.listeners.clear();
  }
}

export const globalEventBus = new EventBus();

export const GameEvents = {
  PLAYER_STATE_CHANGED: 'player:state-changed',
  PLAYER_ATTACK_HIT: 'player:attack-hit',
  GAME_PAUSE_CHANGED: 'game:pause-changed',
  AREA_CHANGED: 'exploration:area-changed',
  INTERACTION_PROMPT_CHANGED: 'exploration:prompt-changed',
  UI_MODAL_CHANGED: 'exploration:ui-modal-changed',
  INVENTORY_UPDATED: 'exploration:inventory-updated',
  CLUES_UPDATED: 'exploration:clues-updated',
  STORY_DIALOGUE_UPDATED: 'story:dialogue-updated',
  STORY_OBJECTIVE_UPDATED: 'story:objective-updated',
  STORY_ANOMALY_FLICKER: 'story:anomaly-flicker',
  STORY_ENTER_ENDING: 'story:enter-ending',
  SAVE_STATUS_NOTIFICATION: 'save:status-notification',
  UI_REQUEST_CLOSE_MODAL: 'ui:request-close-modal',
  UI_REQUEST_ADVANCE_DIALOGUE: 'ui:request-advance-dialogue',
  UI_REQUEST_TOGGLE_INVENTORY: 'ui:request-toggle-inventory',
  UI_REQUEST_RESTART_DEMO: 'ui:request-restart-demo',
  UI_REQUEST_MANUAL_SAVE: 'ui:request-manual-save',
  UI_REQUEST_LOAD_SAVE: 'ui:request-load-save',
  UI_REQUEST_RETURN_MAIN_MENU: 'ui:request-return-main-menu',
  GLOBAL_STATE_CHANGED: 'phase6a:global-state-changed',
  RELATIONSHIP_UPDATED: 'phase6a:relationship-updated',
  EVIDENCE_UPDATED: 'phase6a:evidence-updated',
  QUEST_UPDATED: 'phase6a:quest-updated',
  NPC_DIALOGUE_UPDATED: 'phase6b:npc-dialogue-updated',
  UI_REQUEST_SELECT_NPC_CHOICE: 'phase6b:ui-select-npc-choice',
  TIME_PHASE_CHANGED: 'phase6b:time-phase-changed',
  UI_REQUEST_CYCLE_TIME_PHASE: 'phase6b:ui-cycle-time-phase',
  UI_REQUEST_SCROLL_DOCUMENT: 'phase6b:ui-scroll-document',
} as const;
