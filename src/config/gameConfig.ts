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
import {
  Classroom2BScene,
  CorridorCenter1FScene,
  CorridorCenter2FScene,
  CorridorCenter3FScene,
  CorridorCenter4FScene,
  CorridorCenter5FScene,
  CorridorLeft1FScene,
  CorridorLeft2FScene,
  CorridorLeft3FScene,
  CorridorLeft4FScene,
  CorridorLeft5FScene,
  CorridorRight1FScene,
  CorridorRight2FScene,
  CorridorRight3FScene,
  CorridorRight4FScene,
  CorridorRight5FScene,
  RooftopEquipmentScene,
  RooftopWestScene,
  ScienceReserve4FScene,
  SpecialClassroomScene,
  StudentActivityRoomScene,
  UndergroundB1Scene,
  UndergroundB2Scene,
  UndergroundB3Scene,
} from '../scenes/CampusGridScenes';
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
    Classroom2BScene,
    StudentActivityRoomScene,
    SpecialClassroomScene,
    RooftopWestScene,
    RooftopEquipmentScene,
    ScienceReserve4FScene,
    CorridorLeft1FScene,
    CorridorLeft2FScene,
    CorridorLeft3FScene,
    CorridorLeft4FScene,
    CorridorLeft5FScene,
    CorridorCenter1FScene,
    CorridorCenter2FScene,
    CorridorCenter3FScene,
    CorridorCenter4FScene,
    CorridorCenter5FScene,
    CorridorRight1FScene,
    CorridorRight2FScene,
    CorridorRight3FScene,
    CorridorRight4FScene,
    CorridorRight5FScene,
    UndergroundB1Scene,
    UndergroundB2Scene,
    UndergroundB3Scene,
    GameScene,
    UIScene,
  ],
};
