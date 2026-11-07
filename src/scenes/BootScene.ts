import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  public create(): void {
    // 啟動主選單場景 (可選擇開始新遊戲、讀取存檔繼續或調整音樂與音效音量)
    this.scene.start('MainMenuScene');
  }
}
