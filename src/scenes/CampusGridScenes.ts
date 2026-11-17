import { BaseExplorationScene } from './BaseExplorationScene';

/**
 * Phase 6B-2 校園三棟五層與地下禁區完整網格場景
 *
 * 1. Classroom2BScene (左棟 2F 普通教室 2-B `classroom_2b`)
 * 2. StudentActivityRoomScene (右棟 3F 學生活動空間 `student_activity_room`)
 * 3. SpecialClassroomScene (中間棟 4F 特殊教室與封存資料室 `special_classroom`)
 * 4. RooftopWestScene (左棟 5F 屋頂西區 `rooftop_west`)
 * 5. RooftopEquipmentScene (右棟 5F 屋頂設備區 `rooftop_equipment`)
 * 6. UndergroundB1Scene (地下禁區 B1 研究走廊與檔案室 `underground_b1`)
 * 7. UndergroundB2Scene (地下禁區 B2 秘密實驗設施 `underground_b2`)
 * 8. UndergroundB3Scene (地下禁區 B3 回聲搖籃核心 `underground_b3`)
 */

export class Classroom2BScene extends BaseExplorationScene {
  constructor() {
    super('Classroom2BScene', 'classroom_2b');
  }
}

export class StudentActivityRoomScene extends BaseExplorationScene {
  constructor() {
    super('StudentActivityRoomScene', 'student_activity_room');
  }
}

export class SpecialClassroomScene extends BaseExplorationScene {
  constructor() {
    super('SpecialClassroomScene', 'special_classroom');
  }
}

export class RooftopWestScene extends BaseExplorationScene {
  constructor() {
    super('RooftopWestScene', 'rooftop_west');
  }
}

export class RooftopEquipmentScene extends BaseExplorationScene {
  constructor() {
    super('RooftopEquipmentScene', 'rooftop_equipment');
  }
}

export class UndergroundB1Scene extends BaseExplorationScene {
  constructor() {
    super('UndergroundB1Scene', 'underground_b1');
  }
}

export class UndergroundB2Scene extends BaseExplorationScene {
  constructor() {
    super('UndergroundB2Scene', 'underground_b2');
  }
}

export class UndergroundB3Scene extends BaseExplorationScene {
  constructor() {
    super('UndergroundB3Scene', 'underground_b3');
  }
}
