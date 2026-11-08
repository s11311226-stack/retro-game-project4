import Phaser from 'phaser';
import { LOGICAL_HEIGHT, LOGICAL_WIDTH } from './playerConfig';
import { BootScene } from '../scenes/BootScene';
import { BulletinAreaScene } from '../scenes/BulletinAreaScene';
import {
  AcademicOfficeScene,
  DormitoryScene,
  ForbiddenArchiveScene,
  InfirmaryScene,
  OldLibraryScene,
  RooftopScene,
  TeachersOfficeScene,
} from '../scenes/CampusAreaScenes';
import { ClassroomScene } from '../scenes/ClassroomScene';
import { CorridorScene } from '../scenes/CorridorScene';
import { GameScene } from '../scenes/GameScene';
import { MainMenuScene } from '../scenes/MainMenuScene';
import { SchoolGateScene } from '../scenes/SchoolGateScene';
import { UIScene } from '../scenes/UIScene';

export const gameConfig: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  parent: 'game-container',
  width: LOGICAL_WIDTH,
  height: LOGICAL_HEIGHT,
  backgroundColor: '#0b0c10',
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    zoom: 2, // 預設以整數倍放大顯示 640x360 像素風格畫面
  },
  physics: {
    default: 'arcade',
    arcade: {
      gravity: { x: 0, y: 0 },
      debug: false,
    },
  },
  scene: [
    BootScene,
    MainMenuScene,
    SchoolGateScene,
    BulletinAreaScene,
    CorridorScene,
    ClassroomScene,
    AcademicOfficeScene,
    TeachersOfficeScene,
    DormitoryScene,
    OldLibraryScene,
    ForbiddenArchiveScene,
    RooftopScene,
    InfirmaryScene,
    GameScene,
    UIScene,
  ],
};
