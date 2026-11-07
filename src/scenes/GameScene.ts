import { BaseExplorationScene } from './BaseExplorationScene';

/**
 * 向下相容別名：Phase 1 的 GameScene 繼承自共用探索場景基底
 */
export class GameScene extends BaseExplorationScene {
  constructor() {
    super('GameScene', 'corridor');
  }
}
