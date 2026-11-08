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
    g.fillRect(46, 94, LOGICAL_WIDTH - 92, 226);
    g.lineStyle(2, 0x1e293b, 1);
    g.strokeRect(46, 94, LOGICAL_WIDTH - 92, 226);

    // 主標題與章節副標題（採用清晰繁體中文字體）
    globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        46,
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
        78,
        `NAMELESS CAMPUS — ${DEMO_CHAPTER_TITLE}`,
        'secondaryHint',
        {
          color: '#fcd34d',
        }
      )
      .setOrigin(0.5);

    // 2. 開始新遊戲按鈕 (menuItem: 15px)
    const startNewBtn = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        126,
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
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.playUiClick();
      this.startNewGame();
    });

    // 3. 讀取存檔繼續遊戲按鈕 (menuItem: 15px)
    this.continueBtnText = globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        168,
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
      globalAudioSynth.unlockByUserGesture();
      this.continueFromSave();
    });

    // 存檔詳細狀態列 (secondaryHint: 12px)
    this.saveInfoText = globalFontManager
      .createCrispText(this, LOGICAL_WIDTH / 2, 204, '', 'secondaryHint', {
        color: '#94a3b8',
      })
      .setOrigin(0.5);

    // 4. 音樂與音效音量控制面板
    this.createAudioControlsPanel();

    // 5. 底部操作與授權說明 (secondaryHint: 12px)
    globalFontManager
      .createCrispText(
        this,
        LOGICAL_WIDTH / 2,
        LOGICAL_HEIGHT - 16,
        '640×360 整數倍縮放 | 11 處校園場景・NPC 互動・證據與任務系統 | 點擊或按鍵啟用音訊',
        'secondaryHint',
        {
          color: '#94a3b8',
        }
      )
      .setOrigin(0.5);

    // 鍵盤快捷鍵支援 (Enter/Space 開始新遊戲，C 讀取存檔)
    this.input.keyboard?.on('keydown-ENTER', () => {
      globalAudioSynth.unlockByUserGesture();
      globalAudioSynth.playUiClick();
      this.startNewGame();
    });
    this.input.keyboard?.on('keydown-C', () => {
      globalAudioSynth.unlockByUserGesture();
      this.continueFromSave();
    });

    this.refreshSaveStatusDisplay();
    this.refreshAudioStatusDisplay();
  }

  private createAudioControlsPanel(): void {
    this.audioStatusText = globalFontManager
      .createCrispText(this, LOGICAL_WIDTH / 2, 240, '', 'secondaryHint', {
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
        274,
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
        274,
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
        274,
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
        274,
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
        274,
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
}
