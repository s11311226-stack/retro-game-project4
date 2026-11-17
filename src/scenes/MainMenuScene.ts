import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from '../config/playerConfig';
import { getAreaDefinition } from '../data/campusAreas';
import { DEMO_CHAPTER_TITLE } from '../data/storyScript';
import { globalAudioSynth } from '../systems/AudioSynthManager';
import { globalCampusAtmosphere } from '../systems/CampusAtmosphereSystem';
import { globalRelationshipSystem } from '../systems/CharacterRelationshipSystem';
import { globalEvidenceSystem } from '../systems/EvidenceSystem';
import { globalExplorationState } from '../systems/ExplorationStateManager';
import { globalFontManager } from '../systems/FontManager';
import { globalGameState } from '../systems/GlobalGameState';
import { globalNPCInteractionSystem } from '../systems/NPCInteractionSystem';
import { globalQuestSystem } from '../systems/QuestSystem';
import { globalSaveManager } from '../systems/SaveManager';
import { globalStoryState } from '../systems/StoryStateManager';

/**
 * 正式版與體驗版共用主選單場景 (MainMenuScene)
 *
 * 提供：
 * 1. 「開始新遊戲（重新開始）」與「讀取存檔繼續遊戲」
 * 2. 全面採用 `FontManager` 清晰繁體中文字體（`Noto Sans TC`，選單文字 15px、次要提示 12px、主標題 26px）
 * 3. 存檔狀態檢測（若存檔有效顯示上次儲存位置與狀態，若損毀或無存檔則清楚提示）
 * 4. 可調整的背景音樂音量 (BGM)、音效音量 (SFX) 與靜音開關
 * 5. 遵循瀏覽器首次互動後才啟動音訊的規範
 */
export class MainMenuScene extends Phaser.Scene {
  private saveInfoText!: Phaser.GameObjects.Text;
  private continueBtnText!: Phaser.GameObjects.Text;
  private audioStatusText!: Phaser.GameObjects.Text;
  private fontShowcaseModal!: Phaser.GameObjects.Container;

  constructor() {
    super({ key: 'MainMenuScene' });
  }

  public create(): void {
    // 停止平行 UI 覆蓋層（進入實際探索場景時再啟動）
    if (this.scene.isActive('UIScene')) {
      this.scene.stop('UIScene');
    }

    globalAudioSynth.attachUserGestureUnlock(window);
    globalAudioSynth.startLoopingBgm();

    // 1. 繪製陰暗校區背景與月光剪影
    const g = this.add.graphics();
    g.fillStyle(0x070a12, 1);
    g.fillRect(0, 0, LOGICAL_WIDTH, LOGICAL_HEIGHT);

    // 遠景校舍屋頂與高窗剪影
    g.fillStyle(0x0f172a, 1);
    g.fillRect(46, 86, LOGICAL_WIDTH - 92, 234);
    g.lineStyle(2, 0x1e293b, 1);
    g.strokeRect(46, 86, LOGICAL_WIDTH - 92, 234);

    // 主標題與章節副標題（採用清晰繁體中文字體）
    globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        42,
        '無 名 校 區',
        'menuTitle',
        {
          color: '#f8fafc',
        }
      )
      .setOrigin(0.5);

    globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        72,
        `NAMELESS CAMPUS — ${DEMO_CHAPTER_TITLE}`,
        'secondaryHint',
        {
          color: '#fcd34d',
        }
      )
      .setOrigin(0.5);

    // 2. 開始新遊戲按鈕 (menuItem: 16px)
    const startNewBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        114,
        '▶ 開始新遊戲 (New Game) [Enter / 點擊]',
        'menuItem',
        {
          color: '#fef08a',
          backgroundColor: '#1e293b',
          padding: { x: 14, y: 6 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    startNewBtn.on('pointerdown', () => {
      if (this.fontShowcaseModal && this.fontShowcaseModal.visible) return;
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.playUiClick();
      this.startNewGame();
    });

    // 3. 讀取存檔繼續遊戲按鈕 (menuItem: 16px)
    this.continueBtnText = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        152,
        '📂 讀取存檔繼續 (Continue Saved Game) [C]',
        'menuItem',
        {
          color: '#93c5fd',
          backgroundColor: '#0f172a',
          padding: { x: 14, y: 6 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    this.continueBtnText.on('pointerdown', () => {
      if (this.fontShowcaseModal && this.fontShowcaseModal.visible) return;
      globalAudioSynth.unlockByUserGesture();
      this.continueFromSave();
    });

    // 4. 繁體字體清晰度檢測按鈕 (menuItem: 16px)
    const fontShowcaseBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        190,
        '🔤 繁體字體清晰度檢測展示 (Font Showcase) [F]',
        'menuItem',
        {
          color: '#e9d5ff',
          backgroundColor: '#3b0764',
          padding: { x: 14, y: 5 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    fontShowcaseBtn.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.playUiClick();
      this.openFontShowcaseModal();
    });

    // 存檔詳細狀態列 (secondaryHint: 12px)
    this.saveInfoText = globalFontManager
      .createCrispText(this, LOGICAL_WIDTH / 2, 222, '', 'secondaryHint', {
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    // 5. 音樂與音效音量控制面板
    this.createAudioControlsPanel();

    // 6. 底部操作與說明 (secondaryHint: 12px)
    globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT - 16,
        '640×360 邏輯解析度 | 三棟五層 19 處校園場景・全校地圖 [M]・奔跑 [Shift] | 點擊或按鍵啟用音訊',
        'secondaryHint',
        {
          color: '#94a3b8',
        }
      )
      .setOrigin(0.5);

    // 7. 建立字體檢驗展示視窗
    this.createFontShowcaseModal();

    // 鍵盤快捷鍵支援 (Enter 開始新遊戲，C 讀取存檔，F 開啟字體展示，Esc 關閉展示)
    this.input.keyboard?.on('keydown-ENTER', () => {
      if (this.fontShowcaseModal && this.fontShowcaseModal.visible) return;
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.playUiClick();
      this.startNewGame();
    });
    this.input.keyboard?.on('keydown-C', () => {
      if (this.fontShowcaseModal && this.fontShowcaseModal.visible) return;
      globalAudioSynth.unlockByUserGesture();
      this.continueFromSave();
    });
    this.input.keyboard?.on('keydown-F', () => {
      globalAudioSynth.unlockByUserGesture();
      this.openFontShowcaseModal();
    });
    this.input.keyboard?.on('keydown-ESC', () => {
      this.closeFontShowcaseModal();
    });

    this.refreshSaveStatusDisplay();
    this.refreshAudioStatusDisplay();
  }

  private createAudioControlsPanel(): void {
    this.audioStatusText = globalFontManager
      .createCrispText(this, LOGICAL_WIDTH / 2, 252, '', 'secondaryHint', {
        color: '#a7f3d0',
      })
      .setOrigin(0.5);

    const btnOverrides = {
      color: '#e2e8f0',
      backgroundColor: '#334155',
      padding: { x: 8, y: 4 },
    };

    const bgmDown = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 - 205,
        282,
        '[BGM -]',
        'secondaryHint',
        btnOverrides
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const bgmUp = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 - 130,
        282,
        '[BGM +]',
        'secondaryHint',
        btnOverrides
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const sfxDown = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 - 30,
        282,
        '[SFX -]',
        'secondaryHint',
        btnOverrides
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });
    const sfxUp = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 45,
        282,
        '[SFX +]',
        'secondaryHint',
        btnOverrides
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    const muteBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2 + 160,
        282,
        '[靜音切換 Mute]',
        'secondaryHint',
        btnOverrides
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    bgmDown.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.adjustBgmVolume(-0.1);
      globalAudioSynth.playUiClick();
      this.refreshAudioStatusDisplay();
    });
    bgmUp.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.adjustBgmVolume(0.1);
      globalAudioSynth.playUiClick();
      this.refreshAudioStatusDisplay();
    });
    sfxDown.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.adjustSfxVolume(-0.1);
      globalAudioSynth.playUiClick();
      this.refreshAudioStatusDisplay();
    });
    sfxUp.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.adjustSfxVolume(0.1);
      globalAudioSynth.playUiClick();
      this.refreshAudioStatusDisplay();
    });
    muteBtn.on('pointerdown', () => {
      globalAudioSynth.unlockByUserGesture();
      const cur = globalAudioSynth.getSettings().muted;
      globalAudioSynth.setMuted(!cur);
      globalAudioSynth.playUiClick();
      this.refreshAudioStatusDisplay();
    });
  }

  private refreshSaveStatusDisplay(): void {
    const loadRes = globalSaveManager.loadAndValidateSave();
    if (loadRes.success && loadRes.data) {
      const area = getAreaDefinition(loadRes.data.player.areaId);
      const clueCount = loadRes.data.exploration.clueIds.length;
      const itemCount = loadRes.data.exploration.inventoryItemIds.length;
      const migTag = loadRes.migratedFromLegacy ? ' (已自舊版存檔升級)' : '';
      this.saveInfoText.setText(
        `✓ 偵測到有效存檔 (v${loadRes.data.schemaVersion})${migTag}：位於【${area.title}】 | 物品:${itemCount} | 線索:${clueCount}`
      );
      this.saveInfoText.setColor('#4ade80');
      this.continueBtnText.setAlpha(1);
    } else if (loadRes.reason === 'no_save') {
      this.saveInfoText.setText('（目前尚無存檔紀錄，請點擊「開始新遊戲」）');
      this.saveInfoText.setColor('#94a3b8');
      this.continueBtnText.setAlpha(0.5);
    } else {
      this.saveInfoText.setText(
        `⚠️ 存檔檢查異常 (${loadRes.reason})：已拒絕載入損毀資料，請開始新遊戲`
      );
      this.saveInfoText.setColor('#f87171');
      this.continueBtnText.setAlpha(0.5);
    }
  }

  private refreshAudioStatusDisplay(): void {
    const s = globalAudioSynth.getSettings();
    const bgmPct = Math.round(s.bgmVolume * 100);
    const sfxPct = Math.round(s.sfxVolume * 100);
    const muteStr = s.muted ? '🔇 已靜音 (MUTED)' : '🔊 音訊啟用';
    this.audioStatusText.setText(
      `音訊設定：${muteStr} | 音樂音量 (BGM): ${bgmPct}% | 音效音量 (SFX): ${sfxPct}%`
    );
  }

  private startNewGame(): void {
    globalExplorationState.resetSession('school_gate', 'initial_spawn');
    globalStoryState.resetStoryState();
    globalGameState.reset('system_init', 'New game started from main menu');
    globalRelationshipSystem.reset();
    globalEvidenceSystem.reset();
    globalQuestSystem.reset();
    globalCampusAtmosphere.reset();
    globalNPCInteractionSystem.reset();
    this.scene.launch('UIScene');
    this.scene.start('SchoolGateScene', { spawnId: 'initial_spawn' });
  }

  private continueFromSave(): void {
    const loadRes = globalSaveManager.loadAndValidateSave();
    if (!loadRes.success || !loadRes.data) {
      globalAudioSynth.playAnomalyGlitchStinger();
      this.refreshSaveStatusDisplay();
      return;
    }

    globalAudioSynth.playDoorOpen();
    const restoredLoc = globalSaveManager.applySaveToManagers(
      loadRes.data,
      globalExplorationState,
      globalStoryState
    );
    const targetArea = getAreaDefinition(restoredLoc.areaId);

    this.scene.launch('UIScene');
    this.scene.start(targetArea.sceneKey, {
      spawnId: restoredLoc.spawnId,
      restoredX: restoredLoc.x,
      restoredY: restoredLoc.y,
      restoredFacing: restoredLoc.facing,
    });
  }

  // ==========================================
  // Phase 6B-2: 繁體中文字體清晰度檢測展示介面
  // ==========================================

  private createFontShowcaseModal(): void {
    const modalBg = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        LOGICAL_WIDTH,
        LOGICAL_HEIGHT,
        0x020617,
        0.95
      )
      .setInteractive();

    const panel = this.add
      .rectangle(
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT / 2,
        616,
        338,
        0x090d16,
        0.98
      )
      .setStrokeStyle(2, 0xa855f7);

    const title = globalFontManager
      .createCrispText(
        this,
        24,
        20,
        '🔤 繁體中文字體清晰度與渲染檢驗展示 (FONT SHOWCASE)',
        'speakerName',
        { color: '#c084fc' }
      )
      .setOrigin(0, 0.5);

    const sub = globalFontManager
      .createCrispText(
        this,
        24,
        38,
        '字體配置：Noto Sans TC | 邏輯解析度：640×360 | 筆畫抗模糊對齊 | 嚴格 >= 12px',
        'secondaryHint',
        { color: '#94a3b8' }
      )
      .setOrigin(0, 0.5);

    const closeBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH - 24,
        22,
        '[✕ 關閉 (Esc)]',
        'secondaryHint',
        {
          color: '#f87171',
          backgroundColor: '#450a0add',
          padding: { x: 6, y: 2 },
        }
      )
      .setOrigin(1, 0.5)
      .setInteractive({ useHandCursor: true });

    closeBtn.on('pointerdown', () => this.closeFontShowcaseModal());

    const children: Phaser.GameObjects.GameObject[] = [
      modalBg,
      panel,
      title,
      sub,
      closeBtn,
    ];

    // 左欄 (x = 24 ~ 330)
    // 1. 高難度生僻字與繁體極限筆畫
    const t1 = globalFontManager.createCrispText(
      this,
      24,
      54,
      '【1. 繁體高難度生僻與極限筆畫測試】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const cjkText = globalFontManager.createCrispText(
      this,
      24,
      72,
      '鬱 驫 鸞 鑿 囊 釁 灤 鱟 籲 驚 艷 嚴 龜 囑 攬 疊 驟 體',
      'dialogueBody',
      { color: '#f8fafc' }
    );

    // 2. 劇情世界觀長句實測 (16px)
    const t2 = globalFontManager.createCrispText(
      this,
      24,
      102,
      '【2. 劇情代表長句實測 (16px 正文標準)】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const pangram1 = globalFontManager.createCrispText(
      this,
      24,
      120,
      '「白川財閥於1954年創立私立白川學園，地下三層隱藏回聲搖籃人體實驗。」\n「18.9Hz第四聲鐘響伴隨認知過濾，第29號席位之謎終將揭曉。」',
      'documentBody',
      {
        color: '#e2e8f0',
        wordWrap: { width: 310, useAdvancedWrap: true },
        lineSpacing: 4,
      }
    );

    // 3. 標點符號與英數對齊
    const t3 = globalFontManager.createCrispText(
      this,
      24,
      186,
      '【3. 英數符號與全半形排版對齊】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const symText = globalFontManager.createCrispText(
      this,
      24,
      204,
      '0123456789 | AaBbCcZz | 18.9Hz\n【】『』「」——……！？：；、（）《》',
      'secondaryHint',
      { color: '#cbd5e1' }
    );

    // 4. 高對比度色彩底框測試
    const t4 = globalFontManager.createCrispText(
      this,
      24,
      242,
      '【4. 高對比色彩框實測】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const darkBox = this.add
      .rectangle(94, 276, 140, 36, 0x020617)
      .setStrokeStyle(1, 0x475569);
    const darkBoxText = globalFontManager
      .createCrispText(this, 94, 276, '深底白字 (16px)', 'menuItem', {
        color: '#f8fafc',
      })
      .setOrigin(0.5);

    const lightBox = this.add
      .rectangle(248, 276, 140, 36, 0xf1f5f9)
      .setStrokeStyle(1, 0x94a3b8);
    const lightBoxText = globalFontManager
      .createCrispText(this, 248, 276, '淺底黑字 (16px)', 'menuItem', {
        color: '#0f172a',
      })
      .setOrigin(0.5);

    children.push(
      t1,
      cjkText,
      t2,
      pangram1,
      t3,
      symText,
      t4,
      darkBox,
      darkBoxText,
      lightBox,
      lightBoxText
    );

    // 右欄 (x = 345 ~ 600)
    // 5. 字級階梯規範 (>= 12px)
    const t5 = globalFontManager.createCrispText(
      this,
      345,
      54,
      '【5. 遊戲字級規範階梯 (嚴格 >= 12px)】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const ladder1 = globalFontManager.createCrispText(
      this,
      345,
      72,
      '20px：重大提示 importantPrompt',
      'importantPrompt',
      { color: '#38bdf8' }
    );
    const ladder2 = globalFontManager.createCrispText(
      this,
      345,
      100,
      '17px：說話者名稱 speakerName [蘇語晴]',
      'speakerName',
      { color: '#fcd34d' }
    );
    const ladder3 = globalFontManager.createCrispText(
      this,
      345,
      126,
      '16px：對白內文 dialogueBody [語音與文字]',
      'dialogueBody',
      { color: '#ffffff' }
    );
    const ladder4 = globalFontManager.createCrispText(
      this,
      345,
      152,
      '16px：選單與文件 menuItem / documentBody',
      'menuItem',
      { color: '#a7f3d0' }
    );
    const ladder5 = globalFontManager.createCrispText(
      this,
      345,
      178,
      '12px：次要提示 secondaryHint (系統底限)',
      'secondaryHint',
      { color: '#94a3b8' }
    );

    // 6. 渲染與技術規範摘要
    const t6 = globalFontManager.createCrispText(
      this,
      345,
      206,
      '【6. 字體渲染技術指標】',
      'secondaryHint',
      { color: '#fde68a' }
    );
    const techText = globalFontManager.createCrispText(
      this,
      345,
      224,
      '・字體來源：Google Fonts Noto Sans TC (400, 700)\n・預載機制：BootScene CSS Font Preload 異步就緒\n・抗模糊：roundPixels: true，原尺寸無失真繪製\n・缺字防護：全系列繁體中文、日韓假名與特殊符號\n・標準規格：所有正文與按鈕均嚴格 >= 16px',
      'secondaryHint',
      {
        color: '#6ee7b7',
        lineSpacing: 3,
      }
    );

    const returnBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        316,
        '✕ 返回主選單 / 關閉展示 [Esc / 點擊]',
        'menuItem',
        {
          color: '#fef08a',
          backgroundColor: '#1e293b',
          padding: { x: 12, y: 4 },
        }
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true });

    returnBtn.on('pointerdown', () => this.closeFontShowcaseModal());

    children.push(
      t5,
      ladder1,
      ladder2,
      ladder3,
      ladder4,
      ladder5,
      t6,
      techText,
      returnBtn
    );

    this.fontShowcaseModal = this.add
      .container(0, 0, children)
      .setDepth(100)
      .setVisible(false);
  }

  public openFontShowcaseModal(): void {
    if (this.fontShowcaseModal) {
      this.fontShowcaseModal.setVisible(true);
    }
  }

  public closeFontShowcaseModal(): void {
    if (this.fontShowcaseModal) {
      this.fontShowcaseModal.setVisible(false);
    }
  }
}
