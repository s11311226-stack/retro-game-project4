import type {
  AreaDefinition,
  AreaId,
  BuildingBoundaryConnection,
  BuildingId,
  CorridorDoorDefinition,
  CorridorSceneId,
  InteractableDefinition,
  InventoryItemDef,
  StairwayConnectionDefinition,
} from '../types';

/**
 * 15 個獨立公共走廊場景 ID 清單（3 棟 × 5 層）
 */
export const ALL_CORRIDOR_SCENE_IDS: readonly CorridorSceneId[] = [
  'corridor_left_1f',
  'corridor_left_2f',
  'corridor_left_3f',
  'corridor_left_4f',
  'corridor_left_5f',
  'corridor_center_1f',
  'corridor_center_2f',
  'corridor_center_3f',
  'corridor_center_4f',
  'corridor_center_5f',
  'corridor_right_1f',
  'corridor_right_2f',
  'corridor_right_3f',
  'corridor_right_4f',
  'corridor_right_5f',
] as const;

export const CORRIDOR_GRID_MAP: Record<
  BuildingId,
  Record<1 | 2 | 3 | 4 | 5, CorridorSceneId>
> = {
  left: {
    1: 'corridor_left_1f',
    2: 'corridor_left_2f',
    3: 'corridor_left_3f',
    4: 'corridor_left_4f',
    5: 'corridor_left_5f',
  },
  center: {
    1: 'corridor_center_1f',
    2: 'corridor_center_2f',
    3: 'corridor_center_3f',
    4: 'corridor_center_4f',
    5: 'corridor_center_5f',
  },
  right: {
    1: 'corridor_right_1f',
    2: 'corridor_right_2f',
    3: 'corridor_right_3f',
    4: 'corridor_right_4f',
    5: 'corridor_right_5f',
  },
};

export function isCorridorSceneId(id: string): id is CorridorSceneId {
  return (ALL_CORRIDOR_SCENE_IDS as readonly string[]).includes(id);
}

export function getCorridorSceneId(
  building: BuildingId,
  floor: 1 | 2 | 3 | 4 | 5
): CorridorSceneId {
  return CORRIDOR_GRID_MAP[building][floor];
}

/**
 * 集中式跨棟邊界連通表 (左棟 <-> 中間棟 <-> 右棟，同樓層獨立連通)
 * - 左棟：僅東側邊界 (x=1624) 連接中間棟同樓層；西側為校園外牆。
 * - 中間棟：西側邊界 (x=56) 連接左棟同樓層；東側邊界 (x=1624) 連接右棟同樓層。
 * - 右棟：僅西側邊界 (x=56) 連接中間棟同樓層；東側為校園外牆。
 */
export const BUILDING_BOUNDARY_CONNECTIONS: Record<
  CorridorSceneId,
  {
    west?: BuildingBoundaryConnection;
    east?: BuildingBoundaryConnection;
  }
> = {
  corridor_left_1f: {
    east: {
      direction: 'east',
      fromCorridorId: 'corridor_left_1f',
      targetCorridorId: 'corridor_center_1f',
      building: 'left',
      targetBuilding: 'center',
      floor: 1,
      triggerX: 1624,
      targetSpawnId: 'from_left_building',
      targetSpawnX: 140,
      targetFacing: 'right',
    },
  },
  corridor_left_2f: {
    east: {
      direction: 'east',
      fromCorridorId: 'corridor_left_2f',
      targetCorridorId: 'corridor_center_2f',
      building: 'left',
      targetBuilding: 'center',
      floor: 2,
      triggerX: 1624,
      targetSpawnId: 'from_left_building',
      targetSpawnX: 140,
      targetFacing: 'right',
    },
  },
  corridor_left_3f: {
    east: {
      direction: 'east',
      fromCorridorId: 'corridor_left_3f',
      targetCorridorId: 'corridor_center_3f',
      building: 'left',
      targetBuilding: 'center',
      floor: 3,
      triggerX: 1624,
      targetSpawnId: 'from_left_building',
      targetSpawnX: 140,
      targetFacing: 'right',
    },
  },
  corridor_left_4f: {
    east: {
      direction: 'east',
      fromCorridorId: 'corridor_left_4f',
      targetCorridorId: 'corridor_center_4f',
      building: 'left',
      targetBuilding: 'center',
      floor: 4,
      triggerX: 1624,
      targetSpawnId: 'from_left_building',
      targetSpawnX: 140,
      targetFacing: 'right',
    },
  },
  corridor_left_5f: {
    east: {
      direction: 'east',
      fromCorridorId: 'corridor_left_5f',
      targetCorridorId: 'corridor_center_5f',
      building: 'left',
      targetBuilding: 'center',
      floor: 5,
      triggerX: 1624,
      targetSpawnId: 'from_left_building',
      targetSpawnX: 140,
      targetFacing: 'right',
    },
  },

  corridor_center_1f: {
    west: {
      direction: 'west',
      fromCorridorId: 'corridor_center_1f',
      targetCorridorId: 'corridor_left_1f',
      building: 'center',
      targetBuilding: 'left',
      floor: 1,
      triggerX: 56,
      targetSpawnId: 'from_center_building',
      targetSpawnX: 1540,
      targetFacing: 'left',
    },
    east: {
      direction: 'east',
      fromCorridorId: 'corridor_center_1f',
      targetCorridorId: 'corridor_right_1f',
      building: 'center',
      targetBuilding: 'right',
      floor: 1,
      triggerX: 1624,
      targetSpawnId: 'from_center_building',
      targetSpawnX: 140,
      targetFacing: 'right',
    },
  },
  corridor_center_2f: {
    west: {
      direction: 'west',
      fromCorridorId: 'corridor_center_2f',
      targetCorridorId: 'corridor_left_2f',
      building: 'center',
      targetBuilding: 'left',
      floor: 2,
      triggerX: 56,
      targetSpawnId: 'from_center_building',
      targetSpawnX: 1540,
      targetFacing: 'left',
    },
    east: {
      direction: 'east',
      fromCorridorId: 'corridor_center_2f',
      targetCorridorId: 'corridor_right_2f',
      building: 'center',
      targetBuilding: 'right',
      floor: 2,
      triggerX: 1624,
      targetSpawnId: 'from_center_building',
      targetSpawnX: 140,
      targetFacing: 'right',
    },
  },
  corridor_center_3f: {
    west: {
      direction: 'west',
      fromCorridorId: 'corridor_center_3f',
      targetCorridorId: 'corridor_left_3f',
      building: 'center',
      targetBuilding: 'left',
      floor: 3,
      triggerX: 56,
      targetSpawnId: 'from_center_building',
      targetSpawnX: 1540,
      targetFacing: 'left',
    },
    east: {
      direction: 'east',
      fromCorridorId: 'corridor_center_3f',
      targetCorridorId: 'corridor_right_3f',
      building: 'center',
      targetBuilding: 'right',
      floor: 3,
      triggerX: 1624,
      targetSpawnId: 'from_center_building',
      targetSpawnX: 140,
      targetFacing: 'right',
    },
  },
  corridor_center_4f: {
    west: {
      direction: 'west',
      fromCorridorId: 'corridor_center_4f',
      targetCorridorId: 'corridor_left_4f',
      building: 'center',
      targetBuilding: 'left',
      floor: 4,
      triggerX: 56,
      targetSpawnId: 'from_center_building',
      targetSpawnX: 1540,
      targetFacing: 'left',
    },
    east: {
      direction: 'east',
      fromCorridorId: 'corridor_center_4f',
      targetCorridorId: 'corridor_right_4f',
      building: 'center',
      targetBuilding: 'right',
      floor: 4,
      triggerX: 1624,
      targetSpawnId: 'from_center_building',
      targetSpawnX: 140,
      targetFacing: 'right',
    },
  },
  corridor_center_5f: {
    west: {
      direction: 'west',
      fromCorridorId: 'corridor_center_5f',
      targetCorridorId: 'corridor_left_5f',
      building: 'center',
      targetBuilding: 'left',
      floor: 5,
      triggerX: 56,
      targetSpawnId: 'from_center_building',
      targetSpawnX: 1540,
      targetFacing: 'left',
    },
    east: {
      direction: 'east',
      fromCorridorId: 'corridor_center_5f',
      targetCorridorId: 'corridor_right_5f',
      building: 'center',
      targetBuilding: 'right',
      floor: 5,
      triggerX: 1624,
      targetSpawnId: 'from_center_building',
      targetSpawnX: 140,
      targetFacing: 'right',
    },
  },

  corridor_right_1f: {
    west: {
      direction: 'west',
      fromCorridorId: 'corridor_right_1f',
      targetCorridorId: 'corridor_center_1f',
      building: 'right',
      targetBuilding: 'center',
      floor: 1,
      triggerX: 56,
      targetSpawnId: 'from_right_building',
      targetSpawnX: 1540,
      targetFacing: 'left',
    },
  },
  corridor_right_2f: {
    west: {
      direction: 'west',
      fromCorridorId: 'corridor_right_2f',
      targetCorridorId: 'corridor_center_2f',
      building: 'right',
      targetBuilding: 'center',
      floor: 2,
      triggerX: 56,
      targetSpawnId: 'from_right_building',
      targetSpawnX: 1540,
      targetFacing: 'left',
    },
  },
  corridor_right_3f: {
    west: {
      direction: 'west',
      fromCorridorId: 'corridor_right_3f',
      targetCorridorId: 'corridor_center_3f',
      building: 'right',
      targetBuilding: 'center',
      floor: 3,
      triggerX: 56,
      targetSpawnId: 'from_right_building',
      targetSpawnX: 1540,
      targetFacing: 'left',
    },
  },
  corridor_right_4f: {
    west: {
      direction: 'west',
      fromCorridorId: 'corridor_right_4f',
      targetCorridorId: 'corridor_center_4f',
      building: 'right',
      targetBuilding: 'center',
      floor: 4,
      triggerX: 56,
      targetSpawnId: 'from_right_building',
      targetSpawnX: 1540,
      targetFacing: 'left',
    },
  },
  corridor_right_5f: {
    west: {
      direction: 'west',
      fromCorridorId: 'corridor_right_5f',
      targetCorridorId: 'corridor_center_5f',
      building: 'right',
      targetBuilding: 'center',
      floor: 5,
      triggerX: 56,
      targetSpawnId: 'from_right_building',
      targetSpawnX: 1540,
      targetFacing: 'left',
    },
  },
};

/**
 * 中間棟各層內部樓梯配置（與左右跨棟邊界完全分離，距離邊界 >= 234px）
 */
export const CENTER_BUILDING_STAIRWAYS: Record<
  1 | 2 | 3 | 4 | 5,
  StairwayConnectionDefinition[]
> = {
  1: [
    {
      stairId: 'stair_center_1f_west_up_2f',
      corridorSceneId: 'corridor_center_1f',
      floor: 1,
      side: 'west_stair',
      x: 310,
      width: 56,
      interactionRadius: 56,
      direction: 'up',
      targetFloor: 2,
      targetCorridorId: 'corridor_center_2f',
      targetSpawnId: 'from_stair_west',
      targetSpawnX: 340,
      promptText: '走西側樓梯上樓：中間棟 2F 公共走廊',
    },
    {
      stairId: 'stair_center_1f_east_up_2f',
      corridorSceneId: 'corridor_center_1f',
      floor: 1,
      side: 'east_stair',
      x: 1390,
      width: 56,
      interactionRadius: 56,
      direction: 'up',
      targetFloor: 2,
      targetCorridorId: 'corridor_center_2f',
      targetSpawnId: 'from_stair_east',
      targetSpawnX: 1340,
      promptText: '走東側樓梯上樓：中間棟 2F 公共走廊',
    },
  ],
  2: [
    {
      stairId: 'stair_center_2f_west_down_1f',
      corridorSceneId: 'corridor_center_2f',
      floor: 2,
      side: 'west_stair',
      x: 340,
      width: 56,
      interactionRadius: 56,
      direction: 'down',
      targetFloor: 1,
      targetCorridorId: 'corridor_center_1f',
      targetSpawnId: 'from_stair_west',
      targetSpawnX: 310,
      promptText: '走西側樓梯下樓：中間棟 1F 公共走廊',
    },
    {
      stairId: 'stair_center_2f_east_up_3f',
      corridorSceneId: 'corridor_center_2f',
      floor: 2,
      side: 'east_stair',
      x: 1340,
      width: 56,
      interactionRadius: 56,
      direction: 'up',
      targetFloor: 3,
      targetCorridorId: 'corridor_center_3f',
      targetSpawnId: 'from_stair_east',
      targetSpawnX: 1340,
      promptText: '走東側樓梯上樓：中間棟 3F 公共走廊',
    },
  ],
  3: [
    {
      stairId: 'stair_center_3f_west_down_2f',
      corridorSceneId: 'corridor_center_3f',
      floor: 3,
      side: 'west_stair',
      x: 340,
      width: 56,
      interactionRadius: 56,
      direction: 'down',
      targetFloor: 2,
      targetCorridorId: 'corridor_center_2f',
      targetSpawnId: 'from_stair_west',
      targetSpawnX: 340,
      promptText: '走西側樓梯下樓：中間棟 2F 公共走廊',
    },
    {
      stairId: 'stair_center_3f_east_up_4f',
      corridorSceneId: 'corridor_center_3f',
      floor: 3,
      side: 'east_stair',
      x: 1340,
      width: 56,
      interactionRadius: 56,
      direction: 'up',
      targetFloor: 4,
      targetCorridorId: 'corridor_center_4f',
      targetSpawnId: 'from_stair_east',
      targetSpawnX: 1340,
      promptText: '走東側樓梯上樓：中間棟 4F 公共走廊',
    },
  ],
  4: [
    {
      stairId: 'stair_center_4f_west_down_3f',
      corridorSceneId: 'corridor_center_4f',
      floor: 4,
      side: 'west_stair',
      x: 340,
      width: 56,
      interactionRadius: 56,
      direction: 'down',
      targetFloor: 3,
      targetCorridorId: 'corridor_center_3f',
      targetSpawnId: 'from_stair_west',
      targetSpawnX: 340,
      promptText: '走西側樓梯下樓：中間棟 3F 公共走廊',
    },
    {
      stairId: 'stair_center_4f_east_up_5f',
      corridorSceneId: 'corridor_center_4f',
      floor: 4,
      side: 'east_stair',
      x: 1340,
      width: 56,
      interactionRadius: 56,
      direction: 'up',
      targetFloor: 5,
      targetCorridorId: 'corridor_center_5f',
      targetSpawnId: 'from_stair_east',
      targetSpawnX: 1340,
      promptText: '走東側樓梯上樓：中間棟 5F 公共走廊',
    },
  ],
  5: [
    {
      stairId: 'stair_center_5f_west_down_4f',
      corridorSceneId: 'corridor_center_5f',
      floor: 5,
      side: 'west_stair',
      x: 340,
      width: 56,
      interactionRadius: 56,
      direction: 'down',
      targetFloor: 4,
      targetCorridorId: 'corridor_center_4f',
      targetSpawnId: 'from_stair_west',
      targetSpawnX: 340,
      promptText: '走西側樓梯下樓：中間棟 4F 公共走廊',
    },
    {
      stairId: 'stair_center_5f_east_down_4f',
      corridorSceneId: 'corridor_center_5f',
      floor: 5,
      side: 'east_stair',
      x: 1340,
      width: 56,
      interactionRadius: 56,
      direction: 'down',
      targetFloor: 4,
      targetCorridorId: 'corridor_center_4f',
      targetSpawnId: 'from_stair_east',
      targetSpawnX: 1340,
      promptText: '走東側樓梯下樓：中間棟 4F 公共走廊',
    },
  ],
};

/**
 * 全校走廊房門註冊表 (14 扇室內房間門，全部透過公共走廊按 E 進入)
 */
export const CORRIDOR_DOORS_LIST: readonly CorridorDoorDefinition[] = [
  // 1F
  {
    doorId: 'door_left_1f_teachers',
    destinationSceneId: 'teachers_office',
    corridorSceneId: 'corridor_left_1f',
    building: 'left',
    floor: 1,
    corridorX: 680,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: false,
    promptText: '按 E 進入：教師辦公室',
    returnSpawnId: 'from_room',
    returnX: 680,
    doorVisualCategory: 'admin_door',
  },
  {
    doorId: 'door_right_1f_infirmary',
    destinationSceneId: 'infirmary',
    corridorSceneId: 'corridor_right_1f',
    building: 'right',
    floor: 1,
    corridorX: 960,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: false,
    promptText: '按 E 進入：保健室',
    returnSpawnId: 'from_room',
    returnX: 960,
    doorVisualCategory: 'infirmary_door',
  },

  // 2F
  {
    doorId: 'door_left_2f_classroom',
    destinationSceneId: 'classroom',
    corridorSceneId: 'corridor_left_2f',
    building: 'left',
    floor: 2,
    corridorX: 680,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: true,
    requiredItemId: 'item_rusted_classroom_key',
    lockedMessage:
      '教室門被老舊的銅鎖鎖住了。門牌上寫著「普通教室（三年丙班）」，需要先在中間棟 1F 公共走廊公告欄旁長椅下找到【生鏽的三年丙班鑰匙】。',
    unlockedMessage: '你使用【生鏽的三年丙班鑰匙】打開了三年丙班教室門鎖。',
    promptText: '按 E 進入：普通教室（三年丙班）',
    returnSpawnId: 'from_room',
    returnX: 680,
    doorVisualCategory: 'classroom_door',
  },
  {
    doorId: 'door_center_2f_academic',
    destinationSceneId: 'academic_office',
    corridorSceneId: 'corridor_center_2f',
    building: 'center',
    floor: 2,
    corridorX: 840,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: false,
    promptText: '按 E 進入：教務處',
    returnSpawnId: 'from_room',
    returnX: 840,
    doorVisualCategory: 'admin_door',
  },
  {
    doorId: 'door_right_2f_dormitory',
    destinationSceneId: 'dormitory',
    corridorSceneId: 'corridor_right_2f',
    building: 'right',
    floor: 2,
    corridorX: 960,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: false,
    promptText: '按 E 進入：學生宿舍',
    returnSpawnId: 'from_room',
    returnX: 960,
    doorVisualCategory: 'dorm_door',
  },

  // 3F
  {
    doorId: 'door_left_3f_classroom_2b',
    destinationSceneId: 'classroom_2b',
    corridorSceneId: 'corridor_left_3f',
    building: 'left',
    floor: 3,
    corridorX: 680,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: false,
    promptText: '按 E 進入：2年B班教室',
    returnSpawnId: 'from_room',
    returnX: 680,
    doorVisualCategory: 'classroom_door',
  },
  {
    doorId: 'door_center_3f_old_library',
    destinationSceneId: 'old_library',
    corridorSceneId: 'corridor_center_3f',
    building: 'center',
    floor: 3,
    corridorX: 840,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: false,
    promptText: '按 E 進入：舊圖書館',
    returnSpawnId: 'from_room',
    returnX: 840,
    doorVisualCategory: 'admin_door',
  },
  {
    doorId: 'door_right_3f_student_activity',
    destinationSceneId: 'student_activity_room',
    corridorSceneId: 'corridor_right_3f',
    building: 'right',
    floor: 3,
    corridorX: 960,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: false,
    promptText: '按 E 進入：學生活動室',
    returnSpawnId: 'from_room',
    returnX: 960,
    doorVisualCategory: 'dorm_door',
  },

  // 4F
  {
    doorId: 'door_left_4f_special_classroom',
    destinationSceneId: 'special_classroom',
    corridorSceneId: 'corridor_left_4f',
    building: 'left',
    floor: 4,
    corridorX: 680,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: false,
    promptText: '按 E 進入：特殊教室',
    returnSpawnId: 'from_room',
    returnX: 680,
    doorVisualCategory: 'lab_door',
  },
  {
    doorId: 'door_center_4f_forbidden_archive',
    destinationSceneId: 'forbidden_archive',
    corridorSceneId: 'corridor_center_4f',
    building: 'center',
    floor: 4,
    corridorX: 840,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: true,
    requiredItemId: 'item_forbidden_archive_key',
    lockedMessage:
      '特藏禁書室的厚重鐵門以青銅鎖頭鎖死。請先至中間棟 3F「舊圖書館」與管理員林靜儀交談取得【禁書室特藏銅鑰匙】。',
    unlockedMessage: '你插入【禁書室特藏銅鑰匙】，開啟了禁書室封存鐵門！',
    promptText: '按 E 進入：禁書室',
    returnSpawnId: 'from_room',
    returnX: 840,
    doorVisualCategory: 'locked_door',
  },
  {
    doorId: 'door_right_4f_science_reserve',
    destinationSceneId: 'science_reserve_4f',
    corridorSceneId: 'corridor_right_4f',
    building: 'right',
    floor: 4,
    corridorX: 960,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: true,
    requiredItemId: 'item_brass_locker_token',
    lockedMessage:
      '右棟 4F 封存理化準備室的門鎖需要嵌入式校徽名牌才能旋開。請先在左棟 2F 普通教室取得【刻有校徽的黃銅名牌】。',
    unlockedMessage: '你將【刻有校徽的黃銅名牌】嵌入鎖孔，開啟了封存理化準備室！',
    promptText: '按 E 進入：封存理化準備室（可解鎖房間）',
    returnSpawnId: 'from_room',
    returnX: 960,
    doorVisualCategory: 'locked_door',
  },

  // 5F
  {
    doorId: 'door_left_5f_rooftop_west',
    destinationSceneId: 'rooftop_west',
    corridorSceneId: 'corridor_left_5f',
    building: 'left',
    floor: 5,
    corridorX: 680,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: false,
    promptText: '按 E 進入：西側屋頂',
    returnSpawnId: 'from_room',
    returnX: 680,
    doorVisualCategory: 'gate_door',
  },
  {
    doorId: 'door_center_5f_rooftop',
    destinationSceneId: 'rooftop',
    corridorSceneId: 'corridor_center_5f',
    building: 'center',
    floor: 5,
    corridorX: 840,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: false,
    promptText: '按 E 進入：屋頂花園與鐘塔',
    returnSpawnId: 'from_room',
    returnX: 840,
    doorVisualCategory: 'gate_door',
  },
  {
    doorId: 'door_right_5f_rooftop_equipment',
    destinationSceneId: 'rooftop_equipment',
    corridorSceneId: 'corridor_right_5f',
    building: 'right',
    floor: 5,
    corridorX: 960,
    width: 58,
    interactionRadius: 58,
    isLockedByDefault: false,
    promptText: '按 E 進入：屋頂設備室',
    returnSpawnId: 'from_room',
    returnX: 960,
    doorVisualCategory: 'lab_door',
  },
] as const;

export const CORRIDOR_DOORS_REGISTRY: Record<string, CorridorDoorDefinition> =
  Object.fromEntries(CORRIDOR_DOORS_LIST.map((d) => [d.doorId, d]));

/**
 * 室內場景 -> 所屬公共走廊與房門位置遷移表 (供舊版存檔遷移與室內返回定位使用)
 */
export const INDOOR_ROOM_TO_CORRIDOR_MIGRATION_TABLE: Record<
  string,
  {
    corridorSceneId: CorridorSceneId;
    doorId: string;
    doorX: number;
    returnSpawnId: string;
    buildingId: BuildingId;
    floorLevel: 1 | 2 | 3 | 4 | 5;
  }
> = Object.fromEntries(
  CORRIDOR_DOORS_LIST.map((d) => [
    d.destinationSceneId,
    {
      corridorSceneId: d.corridorSceneId,
      doorId: d.doorId,
      doorX: d.corridorX,
      returnSpawnId: d.returnSpawnId,
      buildingId: d.building,
      floorLevel: d.floor,
    },
  ])
);

export function getDoorsForCorridor(
  corridorId: CorridorSceneId
): CorridorDoorDefinition[] {
  return CORRIDOR_DOORS_LIST.filter((d) => d.corridorSceneId === corridorId);
}

export function getDoorByRoomId(
  roomAreaId: AreaId
): CorridorDoorDefinition | undefined {
  return CORRIDOR_DOORS_LIST.find((d) => d.destinationSceneId === roomAreaId);
}

export function getStairsForCorridor(
  corridorId: CorridorSceneId
): StairwayConnectionDefinition[] {
  const match = corridorId.match(/^corridor_center_([1-5])f$/);
  if (!match) return [];
  const floor = Number(match[1]) as 1 | 2 | 3 | 4 | 5;
  return CENTER_BUILDING_STAIRWAYS[floor] ?? [];
}

/**
 * 驗證指定走廊之門距與碰撞範圍規則：
 * 1. 同一走廊相鄰房門/通道中心距離 >= 220px
 * 2. 任意兩個互動物件之碰撞區與互動範圍 (interactionRadius) 不得重疊
 */
export function validateCorridorSpacingRules(area: AreaDefinition): {
  valid: boolean;
  issues: string[];
} {
  const issues: string[] = [];
  const sorted = [...area.interactables].sort((a, b) => a.x - b.x);

  // 1. 檢查所有 portal 之間中心距離 >= 220px
  const portals = sorted.filter((i) => i.kind === 'portal');
  for (let i = 0; i < portals.length - 1; i++) {
    const p1 = portals[i];
    const p2 = portals[i + 1];
    const centerDist = Math.abs(p2.x - p1.x);
    if (centerDist < 220) {
      issues.push(
        `[${area.id}] Portal center distance too close: ${p1.id}(x=${p1.x}) & ${p2.id}(x=${p2.x}) -> ${centerDist}px < 220px`
      );
    }
  }

  // 2. 檢查所有互動物件碰撞區與 interactionRadius 不重疊
  for (let i = 0; i < sorted.length - 1; i++) {
    const o1 = sorted[i];
    const o2 = sorted[i + 1];
    const centerDist = Math.abs(o2.x - o1.x);
    const minColliderDist = o1.width / 2 + o2.width / 2;
    const minRadiusDist = o1.interactionRadius + o2.interactionRadius;

    if (centerDist <= minColliderDist) {
      issues.push(
        `[${area.id}] Collider overlap: ${o1.id}(x=${o1.x},w=${o1.width}) & ${o2.id}(x=${o2.x},w=${o2.width})`
      );
    }
    if (centerDist <= minRadiusDist) {
      issues.push(
        `[${area.id}] Interaction radius overlap: ${o1.id}(x=${o1.x},r=${o1.interactionRadius}) & ${o2.id}(x=${o2.x},r=${o2.interactionRadius}) -> dist=${centerDist} <= ${minRadiusDist}`
      );
    }
  }

  return {
    valid: issues.length === 0,
    issues,
  };
}

const CORRIDOR_SCENE_KEY_MAP: Record<CorridorSceneId, string> = {
  corridor_left_1f: 'CorridorLeft1FScene',
  corridor_left_2f: 'CorridorLeft2FScene',
  corridor_left_3f: 'CorridorLeft3FScene',
  corridor_left_4f: 'CorridorLeft4FScene',
  corridor_left_5f: 'CorridorLeft5FScene',
  corridor_center_1f: 'CorridorCenter1FScene',
  corridor_center_2f: 'CorridorCenter2FScene',
  corridor_center_3f: 'CorridorCenter3FScene',
  corridor_center_4f: 'CorridorCenter4FScene',
  corridor_center_5f: 'CorridorCenter5FScene',
  corridor_right_1f: 'CorridorRight1FScene',
  corridor_right_2f: 'CorridorRight2FScene',
  corridor_right_3f: 'CorridorRight3FScene',
  corridor_right_4f: 'CorridorRight4FScene',
  corridor_right_5f: 'CorridorRight5FScene',
};

const CORRIDOR_META_MAP: Record<
  CorridorSceneId,
  {
    title: string;
    subtitle: string;
    roomName: string;
    theme: AreaDefinition['theme'];
    examineObj?: {
      id: string;
      name: string;
      x: number;
      promptAction: string;
      inspectLines: string[];
    };
  }
> = {
  corridor_left_1f: {
    title: '左棟・1F 教務辦公走廊',
    subtitle: '左棟一樓公共長廊，西側為校園封閉外牆，中央設有教師辦公室入口，向東連通中間棟 1F 穿堂。',
    roomName: '1F 公共走廊',
    theme: {
      skyOrWallColor: 0x0d1522,
      secondaryWallColor: 0x18253a,
      floorColor: 0x111827,
      accentColor: 0x38bdf8,
    },
    examineObj: {
      id: 'obj_left_1f_faculty_board',
      name: '教職員輪值告示板',
      x: 1120,
      promptAction: '調查「教職員輪值告示板」',
      inspectLines: [
        '木框告示板上掛著各班導師的名牌，三年丙班導師「許文謙」的名牌旁貼著一張便條：「若學生詢問第 29 號課桌，請統一引導至教務處」。',
      ],
    },
  },
  corridor_left_2f: {
    title: '左棟・2F 教學區公共走廊',
    subtitle: '左棟二樓公共長廊，設有普通教室（三年丙班）入口，向東可跨越連廊返回中間棟 2F。',
    roomName: '2F 公共走廊',
    theme: {
      skyOrWallColor: 0x101624,
      secondaryWallColor: 0x1d283d,
      floorColor: 0x121926,
      accentColor: 0xf43f5e,
    },
    examineObj: {
      id: 'obj_left_2f_class_directory',
      name: '二樓教室配置牌',
      x: 1120,
      promptAction: '調查「二樓教室配置牌」',
      inspectLines: [
        '壓克力指示牌標示著左棟 2F 為「三年丙班普通教室（x=680）」，向東走到底即可進入中間棟 2F 行政走廊。',
      ],
    },
  },
  corridor_left_3f: {
    title: '左棟・3F 高年級公共走廊',
    subtitle: '左棟三樓公共長廊，空氣中帶著舊木地板的潮氣，設有 2年B班教室大門。',
    roomName: '3F 公共走廊',
    theme: {
      skyOrWallColor: 0x0f1726,
      secondaryWallColor: 0x1c2940,
      floorColor: 0x111927,
      accentColor: 0x60a5fa,
    },
    examineObj: {
      id: 'obj_left_3f_sealed_window',
      name: '釘死的走廊採光窗',
      x: 1120,
      promptAction: '調查「釘死的走廊採光窗」',
      inspectLines: [
        '面向後山的走廊木窗被厚木條從內部封死，窗縫間隱約能聽見頂樓鐘塔傳來的低頻嗡鳴。',
      ],
    },
  },
  corridor_left_4f: {
    title: '左棟・4F 特別教室公共走廊',
    subtitle: '左棟四樓公共長廊，燈光略顯昏暗，設有特殊教育與聲學實驗教室入口。',
    roomName: '4F 公共走廊',
    theme: {
      skyOrWallColor: 0x131122,
      secondaryWallColor: 0x231e38,
      floorColor: 0x151224,
      accentColor: 0xa855f7,
    },
    examineObj: {
      id: 'obj_left_4f_acoustic_notice',
      name: '聽力篩檢特別通告欄',
      x: 1120,
      promptAction: '調查「聽力篩檢特別通告欄」',
      inspectLines: [
        '通告欄上寫著：「凡在黃昏鐘響時出現耳鳴、幻視或記憶混淆之學生，須立即至本層特殊教室接受共振頻率測試。」',
      ],
    },
  },
  corridor_left_5f: {
    title: '左棟・5F 西側頂樓連廊',
    subtitle: '左棟五樓最高處的半開放式防風連廊，設有通往西側屋頂觀測平台的防風鐵門。',
    roomName: '5F 公共走廊',
    theme: {
      skyOrWallColor: 0x0a101d,
      secondaryWallColor: 0x162033,
      floorColor: 0x0f1623,
      accentColor: 0x38bdf8,
    },
    examineObj: {
      id: 'obj_left_5f_wind_meter',
      name: '頂樓連廊氣壓計箱',
      x: 1120,
      promptAction: '調查「頂樓連廊氣壓計箱」',
      inspectLines: [
        '老舊的指針式氣壓計旁貼著鐘塔維修班的紀錄：「每逢黃昏第四聲鐘響，西側屋頂的共振讀數都會異常飆升」。',
      ],
    },
  },

  corridor_center_1f: {
    title: '中間棟・1F 中央穿堂公共走廊',
    subtitle: '全校核心交通樞紐。整合中庭公告欄與失蹤海報，西接左棟 1F、東接右棟 1F，兩側設上下樓梯，正門通往校門。',
    roomName: '1F 中央穿堂走廊',
    theme: {
      skyOrWallColor: 0x0c1322,
      secondaryWallColor: 0x17253b,
      floorColor: 0x141b2d,
      accentColor: 0xfacc15,
    },
  },
  corridor_center_2f: {
    title: '中間棟・2F 行政區公共走廊',
    subtitle: '中間棟二樓公共走廊，中央設有「教務處」大門，西梯下往 1F、東梯上往 3F，左右連通左棟 2F 與右棟 2F。',
    roomName: '2F 公共走廊',
    theme: {
      skyOrWallColor: 0x121521,
      secondaryWallColor: 0x222638,
      floorColor: 0x151824,
      accentColor: 0xf59e0b,
    },
  },
  corridor_center_3f: {
    title: '中間棟・3F 圖書區公共走廊',
    subtitle: '中間棟三樓公共走廊，中央設有「舊圖書館」拱門，西梯下往 2F、東梯上往 4F，左右連通左棟 3F 與右棟 3F。',
    roomName: '3F 公共走廊',
    theme: {
      skyOrWallColor: 0x0f1624,
      secondaryWallColor: 0x1e293b,
      floorColor: 0x111827,
      accentColor: 0x60a5fa,
    },
    examineObj: {
      id: 'obj_center_3f_book_return',
      name: '圖書館走廊還書箱',
      x: 590,
      promptAction: '調查「圖書館走廊還書箱」',
      inspectLines: [
        '木製還書箱裡塞著幾本未蓋章的舊期刊，封底夾著林靜儀管理員的字條：「特藏室鑰匙僅交付予追查真相之人」。',
      ],
    },
  },
  corridor_center_4f: {
    title: '中間棟・4F 特藏區公共走廊',
    subtitle: '中間棟四樓公共走廊，中央設有上鎖的「禁書室」鐵門，西梯下往 3F、東梯上往 5F，左右連通左棟 4F 與右棟 4F。',
    roomName: '4F 公共走廊',
    theme: {
      skyOrWallColor: 0x141020,
      secondaryWallColor: 0x261d3a,
      floorColor: 0x161224,
      accentColor: 0xa855f7,
    },
    examineObj: {
      id: 'obj_center_4f_warning_stand',
      name: '四樓特藏區立牌',
      x: 590,
      promptAction: '調查「四樓特藏區立牌」',
      inspectLines: [
        '立牌上寫著：「本層中央為校史特藏禁書室，未持圖書館特藏銅鑰匙者嚴禁擅入；東側連廊通往右棟 4F 理化封存區。」',
      ],
    },
  },
  corridor_center_5f: {
    title: '中間棟・5F 鐘塔前公共走廊',
    subtitle: '中間棟五樓最高層走廊，中央鐵門通往「屋頂花園與鐘塔」，兩側樓梯可下往 4F，左右連通東西兩棟 5F。',
    roomName: '5F 公共走廊',
    theme: {
      skyOrWallColor: 0x0b111e,
      secondaryWallColor: 0x172236,
      floorColor: 0x0e1522,
      accentColor: 0xfacc15,
    },
    examineObj: {
      id: 'obj_center_5f_bell_schedule',
      name: '鐘塔作息鳴鐘表',
      x: 590,
      promptAction: '調查「鐘塔作息鳴鐘表」',
      inspectLines: [
        '黃銅銘牌刻著每日三次正常鐘響時間，但最下方被人用鐵釘硬生生刻上第四行：「17:44 — 第四聲鐘響（18.9Hz 認知洗滌）」。',
      ],
    },
  },

  corridor_right_1f: {
    title: '右棟・1F 醫療區公共走廊',
    subtitle: '右棟一樓公共長廊，消毒水氣味濃烈，設有「保健室」入口，向西連通中間棟 1F 穿堂，東側為校園外牆。',
    roomName: '1F 公共走廊',
    theme: {
      skyOrWallColor: 0x0c191e,
      secondaryWallColor: 0x152c35,
      floorColor: 0x0f1e24,
      accentColor: 0x34d399,
    },
    examineObj: {
      id: 'obj_right_1f_medical_cart',
      name: '走廊應急擔架推車',
      x: 580,
      promptAction: '調查「走廊應急擔架推車」',
      inspectLines: [
        '推車下層放著貼有「B1 移送專用」標籤的束縛帶，輪軸上沾著地下室特有的暗紅鐵鏽。',
      ],
    },
  },
  corridor_right_2f: {
    title: '右棟・2F 住宿區公共走廊',
    subtitle: '右棟二樓公共長廊，暖黃壁燈映照著磨石子地面，設有「學生宿舍」入口，向西連通中間棟 2F。',
    roomName: '2F 公共走廊',
    theme: {
      skyOrWallColor: 0x141320,
      secondaryWallColor: 0x242038,
      floorColor: 0x171524,
      accentColor: 0xfbbf24,
    },
    examineObj: {
      id: 'obj_right_2f_dorm_rules',
      name: '住宿生夜間點名守則',
      x: 580,
      promptAction: '調查「住宿生夜間點名守則」',
      inspectLines: [
        '守則第一條：「晚間十點後嚴禁離開右棟 2F 宿舍區；若聽見一樓保健室方向傳來升降機運轉聲，請立即拉上窗簾就寢。」',
      ],
    },
  },
  corridor_right_3f: {
    title: '右棟・3F 社團區公共走廊',
    subtitle: '右棟三樓公共長廊，牆面留有歷屆社團海報殘跡，設有「學生活動室」入口，向西連通中間棟 3F。',
    roomName: '3F 公共走廊',
    theme: {
      skyOrWallColor: 0x101726,
      secondaryWallColor: 0x1d2942,
      floorColor: 0x121a2a,
      accentColor: 0x38bdf8,
    },
    examineObj: {
      id: 'obj_right_3f_club_board',
      name: '社團活動成果櫥窗',
      x: 580,
      promptAction: '調查「社團活動成果櫥窗」',
      inspectLines: [
        '櫥窗裡擺著新聞社與廣播社的舊合照，其中一張照片背後的學生臉部被刻意塗黑，但胸前別著「蘇語嵐」的副社長徽章。',
      ],
    },
  },
  corridor_right_4f: {
    title: '右棟・4F 封存區公共走廊',
    subtitle: '右棟四樓公共長廊，設有需校徽名牌解鎖的「封存理化準備室」入口，向西連通中間棟 4F。',
    roomName: '4F 公共走廊',
    theme: {
      skyOrWallColor: 0x121422,
      secondaryWallColor: 0x1f243a,
      floorColor: 0x141726,
      accentColor: 0xc084fc,
    },
    examineObj: {
      id: 'obj_right_4f_specimen_rack',
      name: '封存的舊理化標本櫃',
      x: 580,
      promptAction: '調查「封存的舊理化標本櫃」',
      inspectLines: [
        '櫃上貼著 1998 年的封條：「右棟 4F 理化準備室已改列為白川藥學部附屬樣本室，須持黃銅校徽名牌方可開啟房門」。',
      ],
    },
  },
  corridor_right_5f: {
    title: '右棟・5F 機電區頂樓連廊',
    subtitle: '右棟五樓公共連廊，牆面布滿粗大的高壓電纜管道，設有「屋頂設備室」入口，向西連通中間棟 5F。',
    roomName: '5F 公共走廊',
    theme: {
      skyOrWallColor: 0x0b121e,
      secondaryWallColor: 0x162236,
      floorColor: 0x0e1624,
      accentColor: 0xf97316,
    },
    examineObj: {
      id: 'obj_right_5f_voltage_sign',
      name: '高壓電纜管道警示牌',
      x: 580,
      promptAction: '調查「高壓電纜管道警示牌」',
      inspectLines: [
        '警示牌寫著：「前方屋頂設備室供應中間棟 5F 鐘塔擴音陣列之主電力，非機電維護人員嚴禁切斷電源。」',
      ],
    },
  },
};

const BUILDING_DISPLAY_NAME: Record<BuildingId, string> = {
  left: '左棟',
  center: '中間棟',
  right: '右棟',
};

/**
 * 建立 15 個獨立公共走廊場景與右棟 4F 預留可解鎖房間之完整定義
 */
export function buildCorridorAndReserveAreas(
  rustedKeyItem: InventoryItemDef
): Record<CorridorSceneId | 'science_reserve_4f', AreaDefinition> {
  const result = {} as Record<
    CorridorSceneId | 'science_reserve_4f',
    AreaDefinition
  >;

  for (const corridorId of ALL_CORRIDOR_SCENE_IDS) {
    const match = corridorId.match(/^corridor_(left|center|right)_([1-5])f$/)!;
    const building = match[1] as BuildingId;
    const floor = Number(match[2]) as 1 | 2 | 3 | 4 | 5;
    const buildingName = BUILDING_DISPLAY_NAME[building];
    const floorName = `${floor}F`;
    const meta = CORRIDOR_META_MAP[corridorId];
    const boundaries = BUILDING_BOUNDARY_CONNECTIONS[corridorId];
    const doors = getDoorsForCorridor(corridorId);
    const stairs = getStairsForCorridor(corridorId);

    const spawns: AreaDefinition['spawns'] = {
      default_spawn: {
        id: 'default_spawn',
        x: building === 'center' && floor === 1 ? 550 : 240,
        facing: 'right',
      },
      from_left_building: {
        id: 'from_left_building',
        x: 140,
        facing: 'right',
      },
      from_center_building: {
        id: 'from_center_building',
        x: building === 'left' ? 1540 : 140,
        facing: building === 'left' ? 'left' : 'right',
      },
      from_right_building: {
        id: 'from_right_building',
        x: 1540,
        facing: 'left',
      },
      from_stair_west: {
        id: 'from_stair_west',
        x: floor === 1 ? 310 : 340,
        facing: 'right',
      },
      from_stair_east: {
        id: 'from_stair_east',
        x: floor === 1 ? 1390 : 1340,
        facing: 'left',
      },
    };

    if (corridorId === 'corridor_center_1f') {
      spawns.from_gate = { id: 'from_gate', x: 550, facing: 'right' };
    }

    for (const door of doors) {
      spawns[door.returnSpawnId] = {
        id: door.returnSpawnId,
        x: door.returnX,
        facing: 'right',
      };
      spawns[`from_${door.destinationSceneId}`] = {
        id: `from_${door.destinationSceneId}`,
        x: door.returnX,
        facing: 'right',
      };
    }

    // 支援舊有習慣 spawn ID 別名
    if (corridorId === 'corridor_left_1f') {
      spawns.from_teachers = { id: 'from_teachers', x: 680, facing: 'right' };
    } else if (corridorId === 'corridor_right_1f') {
      spawns.from_infirmary = { id: 'from_infirmary', x: 960, facing: 'left' };
      spawns.from_bulletin = { id: 'from_bulletin', x: 140, facing: 'right' };
    } else if (corridorId === 'corridor_left_2f') {
      spawns.from_classroom = { id: 'from_classroom', x: 680, facing: 'right' };
    } else if (corridorId === 'corridor_center_2f') {
      spawns.from_academic = { id: 'from_academic', x: 840, facing: 'right' };
    } else if (corridorId === 'corridor_right_2f') {
      spawns.from_dormitory = { id: 'from_dormitory', x: 960, facing: 'left' };
    } else if (corridorId === 'corridor_center_3f') {
      spawns.from_library = { id: 'from_library', x: 840, facing: 'right' };
    } else if (corridorId === 'corridor_center_4f') {
      spawns.from_forbidden = { id: 'from_forbidden', x: 840, facing: 'right' };
    } else if (corridorId === 'corridor_center_5f') {
      spawns.from_rooftop = { id: 'from_rooftop', x: 840, facing: 'right' };
    }

    const interactables: InteractableDefinition[] = [];

    // 1. 西側跨棟邊界連通門 (x = 56)
    if (boundaries.west) {
      const wb = boundaries.west;
      const targetBldName = BUILDING_DISPLAY_NAME[wb.targetBuilding];
      interactables.push({
        id: `boundary_${corridorId}_west_to_${wb.targetCorridorId}`,
        areaId: corridorId,
        name: `西側跨棟連廊（往${targetBldName} ${floor}F）`,
        kind: 'portal',
        x: wb.triggerX,
        y: 312,
        width: 52,
        height: 98,
        interactionRadius: 55,
        promptAction: `前往${targetBldName} ${floor}F 公共走廊（或直接向西走過邊界）`,
        visualStyle: 'corridor_arch',
        portal: {
          targetAreaId: wb.targetCorridorId,
          targetSpawnId: wb.targetSpawnId,
        },
      });
    }

    // 2. 中間棟西側樓梯
    const westStair = stairs.find((s) => s.side === 'west_stair');
    if (westStair) {
      interactables.push({
        id: westStair.stairId,
        areaId: corridorId,
        name: `西側樓梯（往 ${westStair.targetFloor}F 走廊）`,
        kind: 'portal',
        x: westStair.x,
        y: 312,
        width: westStair.width,
        height: 96,
        interactionRadius: westStair.interactionRadius,
        promptAction: westStair.promptText,
        visualStyle: 'staircase',
        portal: {
          targetAreaId: westStair.targetCorridorId,
          targetSpawnId: westStair.targetSpawnId,
        },
      });
    }

    // 3. 中間棟 1F 特有：返回校門大門 + 陳品妍 + 公告欄 + 失蹤海報 + 三年丙班鑰匙
    if (corridorId === 'corridor_center_1f') {
      interactables.push(
        {
          id: 'portal_center_1f_to_gate',
          areaId: 'corridor_center_1f',
          name: '穿堂正門（往校門前廣場）',
          kind: 'portal',
          x: 550,
          y: 312,
          width: 58,
          height: 96,
          interactionRadius: 56,
          promptAction: '按 E 離開：返回「校門前廣場」',
          visualStyle: 'gate_door',
          portal: {
            targetAreaId: 'school_gate',
            targetSpawnId: 'from_corridor',
          },
        },
        {
          id: 'npc_center_1f_chen_pinyan',
          areaId: 'corridor_center_1f',
          name: '陳品妍（新聞社社長）',
          kind: 'npc',
          npcId: 'chen_pinyan',
          x: 760,
          y: 312,
          width: 34,
          height: 64,
          interactionRadius: 52,
          promptAction: '與「陳品妍（新聞社社長）」交談',
          visualStyle: 'npc_character',
        },
        {
          id: 'obj_center_1f_bulletin_board',
          areaId: 'corridor_center_1f',
          name: '中庭校園公告欄',
          kind: 'examine',
          x: 940,
          y: 312,
          width: 88,
          height: 74,
          interactionRadius: 56,
          promptAction: '調查「中庭校園公告欄」',
          visualStyle: 'bulletin_board',
          grantEvidenceId: 'clue_bulletin_board_hint',
          inspectLines: [
            '木製公告欄上張貼著三年丙班的正式學生名冊（共 28 人），名冊上完全沒有「林曉月」這個名字。',
            '角落有一行紅粉筆字跡：「三年丙班的備用鑰匙藏在公告欄右側長椅下，教室位於左棟 2F 公共走廊。」',
          ],
          clue: {
            id: 'clue_bulletin_board_hint',
            title: '公告欄名冊與長椅下的鑰匙',
            summary:
              '公告欄的正式班級名冊沒有林曉月；備用鑰匙藏在右側長椅下方。',
            sourceObjectId: 'obj_center_1f_bulletin_board',
          },
        },
        {
          id: 'doc_center_1f_missing_poster',
          areaId: 'corridor_center_1f',
          name: '失蹤學生海報',
          kind: 'document',
          x: 1110,
          y: 312,
          width: 34,
          height: 48,
          interactionRadius: 50,
          promptAction: '閱讀「失蹤學生海報」',
          visualStyle: 'poster',
          grantEvidenceId: 'clue_missing_student_poster',
          document: {
            id: 'doc_center_1f_missing_poster_content',
            title: '【協尋失蹤學生海報】',
            subtitle: '三年丙班・林曉月（學號 0419 / 第 29 號席位）',
            pages: [
              '失蹤學生：三年丙班 林曉月（第 29 號觀測席位）。\n最後目擊地點：左棟 2F 普通教室、中間棟 2F 教務處與右棟 1F 保健室。',
              '怪異的是，旁邊公告欄的正式班級點名簿上根本沒有「林曉月」這個人。\n海報下方被人用指甲刮出字跡：「去左棟 2F 教室裡翻開那份真正的校務文件，並把海報給新聞社陳品妍看」。',
            ],
            clue: {
              id: 'clue_missing_student_poster',
              title: '點名簿上不存在的失蹤學生海報',
              summary:
                '海報協尋三年丙班學生「林曉月」，但正式班級名冊上卻不存在此人。',
              sourceObjectId: 'doc_center_1f_missing_poster',
            },
          },
        },
        {
          id: 'pickup_center_1f_rusted_key',
          areaId: 'corridor_center_1f',
          name: '生鏽的三年丙班鑰匙',
          kind: 'pickup',
          x: 1245,
          y: 312,
          width: 26,
          height: 26,
          interactionRadius: 46,
          promptAction: '拾取「生鏽的三年丙班鑰匙」',
          visualStyle: 'key_item',
          grantEvidenceId: 'item_rusted_classroom_key',
          pickup: {
            item: rustedKeyItem,
            pickupMessage:
              '你從穿堂長椅下方的縫隙拿起了【生鏽的三年丙班鑰匙】（可前往左棟 2F 公共走廊開啟三年丙班教室門）。',
          },
        }
      );
    }

    // 4. 中間棟 2F 特有：趙家豪 (x = 590) 與 校史沿革銅牌 (x = 1090)
    if (corridorId === 'corridor_center_2f') {
      interactables.push({
        id: 'npc_center_2f_zhao_jiahao',
        areaId: 'corridor_center_2f',
        name: '趙家豪（田徑隊主將）',
        kind: 'npc',
        npcId: 'zhao_jiahao',
        x: 590,
        y: 312,
        width: 34,
        height: 64,
        interactionRadius: 54,
        promptAction: '與「趙家豪（田徑隊主將）」交談',
        visualStyle: 'npc_character',
      });
    }

    // 5. 一般走廊調查物件（若該走廊設定在房門左側，如中間棟 3F~5F 與右棟 1F~5F）
    if (meta.examineObj && meta.examineObj.x < 700) {
      interactables.push({
        id: meta.examineObj.id,
        areaId: corridorId,
        name: meta.examineObj.name,
        kind: 'examine',
        x: meta.examineObj.x,
        y: 312,
        width: 44,
        height: 54,
        interactionRadius: 54,
        promptAction: meta.examineObj.promptAction,
        visualStyle: 'bulletin_board',
        inspectLines: meta.examineObj.inspectLines,
      });
    }

    // 6. 本層走廊所屬室內房門 (doors)
    for (const door of doors) {
      const roomLabel = door.promptText.replace('按 E 進入：', '');
      interactables.push({
        id: door.doorId,
        areaId: corridorId,
        name: `${roomLabel}大門`,
        kind: 'portal',
        x: door.corridorX,
        y: 312,
        width: door.width,
        height: 96,
        interactionRadius: door.interactionRadius,
        promptAction: door.promptText,
        visualStyle: door.doorVisualCategory,
        portal: {
          targetAreaId: door.destinationSceneId,
          targetSpawnId: 'from_corridor',
          requiredItemId: door.requiredItemId,
          lockedMessage: door.lockedMessage,
          unlockedMessage: door.unlockedMessage,
        },
      });
    }

    // 7. 一般走廊調查物件（若設定在房門右側，如左棟 1F~5F 的 x = 1120）
    if (meta.examineObj && meta.examineObj.x >= 700) {
      interactables.push({
        id: meta.examineObj.id,
        areaId: corridorId,
        name: meta.examineObj.name,
        kind: 'examine',
        x: meta.examineObj.x,
        y: 312,
        width: 44,
        height: 54,
        interactionRadius: 54,
        promptAction: meta.examineObj.promptAction,
        visualStyle: 'bulletin_board',
        inspectLines: meta.examineObj.inspectLines,
      });
    }

    // 中間棟 2F 第二調查物件：走廊歷史沿革碑 (x = 1090)
    if (corridorId === 'corridor_center_2f') {
      interactables.push({
        id: 'obj_center_2f_history_plaque',
        areaId: 'corridor_center_2f',
        name: '走廊歷史沿革碑',
        kind: 'examine',
        x: 1090,
        y: 312,
        width: 44,
        height: 52,
        interactionRadius: 54,
        promptAction: '調查「走廊歷史沿革碑」',
        visualStyle: 'bulletin_board',
        grantEvidenceId: 'clue_corridor_history_plaque',
        inspectLines: [
          '牆上的銅牌清楚記載：「本校區由白川財閥捐資興建，於西元 2004 年 9 月正式啟用招生。」',
          '然而銅牌邊緣卻有被撬開重釘的痕跡，螺絲孔下露出更古老的「1979」字樣。',
        ],
        clue: {
          id: 'clue_corridor_history_plaque',
          title: '2004 年正式啟用的校史銅牌',
          summary:
            '走廊銅牌記載學校於 2004 年 9 月才正式啟用，但牆面似乎比建校日期更古老。',
          sourceObjectId: 'obj_center_2f_history_plaque',
        },
      });
    }

    // 8. 中間棟東側樓梯
    const eastStair = stairs.find((s) => s.side === 'east_stair');
    if (eastStair) {
      interactables.push({
        id: eastStair.stairId,
        areaId: corridorId,
        name: `東側樓梯（往 ${eastStair.targetFloor}F 走廊）`,
        kind: 'portal',
        x: eastStair.x,
        y: 312,
        width: eastStair.width,
        height: 96,
        interactionRadius: eastStair.interactionRadius,
        promptAction: eastStair.promptText,
        visualStyle: 'staircase',
        portal: {
          targetAreaId: eastStair.targetCorridorId,
          targetSpawnId: eastStair.targetSpawnId,
        },
      });
    }

    // 9. 東側跨棟邊界連通門 (x = 1624)
    if (boundaries.east) {
      const eb = boundaries.east;
      const targetBldName = BUILDING_DISPLAY_NAME[eb.targetBuilding];
      interactables.push({
        id: `boundary_${corridorId}_east_to_${eb.targetCorridorId}`,
        areaId: corridorId,
        name: `東側跨棟連廊（往${targetBldName} ${floor}F）`,
        kind: 'portal',
        x: eb.triggerX,
        y: 312,
        width: 52,
        height: 98,
        interactionRadius: 55,
        promptAction: `前往${targetBldName} ${floor}F 公共走廊（或直接向東走過邊界）`,
        visualStyle: 'corridor_arch',
        portal: {
          targetAreaId: eb.targetCorridorId,
          targetSpawnId: eb.targetSpawnId,
        },
      });
    }

    result[corridorId] = {
      id: corridorId,
      sceneKey: CORRIDOR_SCENE_KEY_MAP[corridorId],
      title: meta.title,
      subtitle: meta.subtitle,
      building,
      buildingName,
      floor,
      floorName,
      roomName: meta.roomName,
      fullDisplayName: `${buildingName}｜${floorName}｜${meta.roomName}`,
      isCorridor: true,
      boundaryConnections: boundaries,
      bounds: {
        minX: 0,
        maxX: 1680,
        width: 1680,
        height: 360,
        floorY: 312,
        floorHeight: 48,
      },
      theme: meta.theme,
      defaultSpawnId:
        corridorId === 'corridor_center_1f' ? 'from_gate' : 'default_spawn',
      spawns,
      interactables,
    };
  }

  // 右棟 4F 預留可解鎖室內場景：封存理化準備室 (science_reserve_4f)
  result.science_reserve_4f = {
    id: 'science_reserve_4f',
    sceneKey: 'ScienceReserve4FScene',
    title: '右棟・4F 封存理化準備室',
    subtitle: '塵封多年的化學藥劑調配室，實驗桌上留著白川醫療化學研究所時代的鎮靜劑與共振腦波紀錄。',
    building: 'right',
    buildingName: '右棟',
    floor: 4,
    floorName: '4F',
    roomName: '封存理化準備室',
    fullDisplayName: '右棟｜4F｜封存理化準備室',
    isCorridor: false,
    parentCorridorId: 'corridor_right_4f',
    bounds: {
      minX: 0,
      maxX: 840,
      width: 840,
      height: 360,
      floorY: 312,
      floorHeight: 48,
    },
    theme: {
      skyOrWallColor: 0x0e1520,
      secondaryWallColor: 0x1a2638,
      floorColor: 0x111926,
      accentColor: 0x38bdf8,
    },
    defaultSpawnId: 'from_corridor',
    spawns: {
      from_corridor: { id: 'from_corridor', x: 140, facing: 'right' },
    },
    interactables: [
      {
        id: 'portal_science_reserve_to_corridor',
        areaId: 'science_reserve_4f',
        name: '準備室出口（返回右棟 4F 走廊）',
        kind: 'portal',
        x: 90,
        y: 312,
        width: 56,
        height: 96,
        interactionRadius: 64,
        promptAction: '按 E 離開：返回「右棟 4F 公共走廊」',
        visualStyle: 'lab_door',
        portal: {
          targetAreaId: 'corridor_right_4f',
          targetSpawnId: 'from_room',
        },
      },
      {
        id: 'doc_science_sedative_formula',
        areaId: 'science_reserve_4f',
        name: '白川藥學部神經阻斷劑配方表',
        kind: 'document',
        x: 360,
        y: 312,
        width: 36,
        height: 40,
        interactionRadius: 65,
        promptAction: '閱讀「神經阻斷劑配方表」',
        visualStyle: 'folder_doc',
        document: {
          id: 'doc_science_sedative_formula_content',
          title: '【SC-189 記憶抑制溶劑與次聲波協同報告】',
          subtitle: '白川醫療化學研究所・第四準備室封存檔案',
          pages: [
            '「單獨施打 SC-189 鎮靜劑僅能產生短暫失憶；但若配合頂樓鐘塔於黃昏發射之 18.9Hz 第四聲鐘響，可達成全校師生對特定對象（第 29 號席位）的永久認知抹除。」',
            '「備註：右棟 1F 保健室藥櫃之安ンプル即由本準備室調配供應。」',
          ],
          clue: {
            id: 'clue_science_sedative_formula',
            title: 'SC-189 記憶抑制溶劑配方',
            summary:
              '揭露右棟 4F 準備室曾調配供應保健室的記憶抑制劑，與 18.9Hz 鐘響產生協同遺忘效應。',
            sourceObjectId: 'doc_science_sedative_formula',
          },
        },
      },
      {
        id: 'obj_science_centrifuge',
        areaId: 'science_reserve_4f',
        name: '封存的高速離心機與樣本架',
        kind: 'examine',
        x: 640,
        y: 312,
        width: 58,
        height: 64,
        interactionRadius: 66,
        promptAction: '調查「高速離心機與樣本架」',
        visualStyle: 'medicine_cabinet',
        inspectLines: [
          '試管架上還留著標記「EC-028 蘇語嵐」與「EC-029 林曉月」的血清樣本空瓶，證實兩人皆曾被帶往地下實驗設施。',
        ],
      },
    ],
  };

  return result;
}
