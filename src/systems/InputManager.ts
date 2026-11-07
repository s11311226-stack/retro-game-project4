import { DEFAULT_KEY_BINDINGS } from '../config/playerConfig';
import type { InputSnapshot, KeyBindingConfig } from '../types';

/**
 * 集中式玩家輸入管理器 (鍵盤 + 滑鼠 + 焦點丟失安全清除)
 * 將按鍵與滑鼠事件封裝為每幀的 InputSnapshot，避免輸入判斷散落在各個 Scene 中，
 * 並確保當瀏覽器視窗失焦 (blur) 或隱藏 (visibilitychange) 時自動清除所有按住狀態，
 * 防止卡鍵造成角色持續移動或持續攻擊。
 */
export class InputManager {
  private bindings: KeyBindingConfig;
  private heldKeys = new Set<string>();
  private justPressedKeys = new Set<string>();

  private mouseLeftHeld = false;
  private mouseLeftJustPressed = false;
  private mouseRightHeld = false;

  private boundKeyDown?: (e: KeyboardEvent) => void;
  private boundKeyUp?: (e: KeyboardEvent) => void;
  private boundMouseDown?: (e: MouseEvent) => void;
  private boundMouseUp?: (e: MouseEvent) => void;
  private boundContextMenu?: (e: MouseEvent) => void;
  private boundBlur?: () => void;
  private boundVisibilityChange?: () => void;

  private targetWindow?: Window;

  constructor(customBindings?: Partial<KeyBindingConfig>) {
    this.bindings = {
      ...DEFAULT_KEY_BINDINGS,
      ...customBindings,
    };
  }

  public attachToDom(win: Window = window): void {
    this.detachFromDom();
    this.targetWindow = win;

    this.boundKeyDown = (e: KeyboardEvent) => {
      this.handleKeyDown(e.code);
    };
    this.boundKeyUp = (e: KeyboardEvent) => {
      this.handleKeyUp(e.code);
    };
    this.boundMouseDown = (e: MouseEvent) => {
      this.handleMouseDown(e.button);
    };
    this.boundMouseUp = (e: MouseEvent) => {
      this.handleMouseUp(e.button);
    };
    this.boundContextMenu = (e: MouseEvent) => {
      if (this.bindings.enableMouseCombat) {
        e.preventDefault();
      }
    };
    this.boundBlur = () => {
      this.resetAllInputs();
    };
    this.boundVisibilityChange = () => {
      if (win.document && win.document.hidden) {
        this.resetAllInputs();
      }
    };

    win.addEventListener('keydown', this.boundKeyDown);
    win.addEventListener('keyup', this.boundKeyUp);
    win.addEventListener('mousedown', this.boundMouseDown);
    win.addEventListener('mouseup', this.boundMouseUp);
    win.addEventListener('contextmenu', this.boundContextMenu);
    win.addEventListener('blur', this.boundBlur);
    if (win.document) {
      win.document.addEventListener('visibilitychange', this.boundVisibilityChange);
    }
  }

  public detachFromDom(): void {
    if (!this.targetWindow) return;
    const win = this.targetWindow;
    if (this.boundKeyDown) win.removeEventListener('keydown', this.boundKeyDown);
    if (this.boundKeyUp) win.removeEventListener('keyup', this.boundKeyUp);
    if (this.boundMouseDown) win.removeEventListener('mousedown', this.boundMouseDown);
    if (this.boundMouseUp) win.removeEventListener('mouseup', this.boundMouseUp);
    if (this.boundContextMenu) win.removeEventListener('contextmenu', this.boundContextMenu);
    if (this.boundBlur) win.removeEventListener('blur', this.boundBlur);
    if (this.boundVisibilityChange && win.document) {
      win.document.removeEventListener('visibilitychange', this.boundVisibilityChange);
    }
    this.targetWindow = undefined;
  }

  public handleKeyDown(code: string): void {
    // 忽略長按重複觸發的 keydown，確保 justPressed 只在首次按下時觸發一次
    if (!this.heldKeys.has(code)) {
      this.justPressedKeys.add(code);
    }
    this.heldKeys.add(code);
  }

  public handleKeyUp(code: string): void {
    this.heldKeys.delete(code);
    this.justPressedKeys.delete(code);
  }

  public handleMouseDown(button: number): void {
    if (!this.bindings.enableMouseCombat) return;
    if (button === 0) {
      if (!this.mouseLeftHeld) {
        this.mouseLeftJustPressed = true;
      }
      this.mouseLeftHeld = true;
    } else if (button === 2) {
      this.mouseRightHeld = true;
    }
  }

  public handleMouseUp(button: number): void {
    if (button === 0) {
      this.mouseLeftHeld = false;
      this.mouseLeftJustPressed = false;
    } else if (button === 2) {
      this.mouseRightHeld = false;
    }
  }

  /**
   * 當視窗失去焦點 (blur)、切換分頁或遊戲暫停切換時，清除所有殘留按鍵與滑鼠狀態
   */
  public resetAllInputs(): void {
    this.heldKeys.clear();
    this.justPressedKeys.clear();
    this.mouseLeftHeld = false;
    this.mouseLeftJustPressed = false;
    this.mouseRightHeld = false;
  }

  public updateBindings(newBindings: Partial<KeyBindingConfig>): void {
    this.bindings = {
      ...this.bindings,
      ...newBindings,
    };
  }

  public getBindings(): KeyBindingConfig {
    return { ...this.bindings };
  }

  /**
   * 擷取當前這幀的輸入快照，並同時消耗掉單次觸發 (justPressed) 訊號
   */
  public consumeSnapshot(): InputSnapshot {
    const moveLeft = this.isAnyHeld(this.bindings.moveLeft);
    const moveRight = this.isAnyHeld(this.bindings.moveRight);
    const jumpJustPressed = this.isAnyJustPressed(this.bindings.jump);
    const attackJustPressed =
      this.isAnyJustPressed(this.bindings.attack) ||
      (this.bindings.enableMouseCombat && this.mouseLeftJustPressed);
    const blockHeld =
      this.isAnyHeld(this.bindings.block) ||
      (this.bindings.enableMouseCombat && this.mouseRightHeld);
    const interactJustPressed = this.isAnyJustPressed(this.bindings.interact);
    const inventoryJustPressed = this.isAnyJustPressed(this.bindings.inventory);
    const pauseJustPressed = this.isAnyJustPressed(this.bindings.pause);

    // 消耗單幀觸發狀態
    this.justPressedKeys.clear();
    this.mouseLeftJustPressed = false;

    return {
      moveLeft,
      moveRight,
      jumpJustPressed,
      attackJustPressed,
      blockHeld,
      interactJustPressed,
      inventoryJustPressed,
      pauseJustPressed,
    };
  }

  private isAnyHeld(codes: string[]): boolean {
    return codes.some((code) => this.heldKeys.has(code));
  }

  private isAnyJustPressed(codes: string[]): boolean {
    return codes.some((code) => this.justPressedKeys.has(code));
  }
}
