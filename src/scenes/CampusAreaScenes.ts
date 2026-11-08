import { BaseExplorationScene } from './BaseExplorationScene';

/**
 * Phase 6B 第一批正式版 7 大新增校園探索場景
 *
 * 1. AcademicOfficeScene (教務處 `academic_office`)
 * 2. TeachersOfficeScene (教師辦公室 `teachers_office`)
 * 3. DormitoryScene (學生宿舍 `dormitory`)
 * 4. OldLibraryScene (舊圖書館 `old_library`)
 * 5. ForbiddenArchiveScene (禁書室 `forbidden_archive`)
 * 6. RooftopScene (教學樓頂樓與鐘塔 `rooftop`)
 * 7. InfirmaryScene (保健室 `infirmary`)
 */

export class AcademicOfficeScene extends BaseExplorationScene {
  constructor() {
    super('AcademicOfficeScene', 'academic_office');
  }
}

export class TeachersOfficeScene extends BaseExplorationScene {
  constructor() {
    super('TeachersOfficeScene', 'teachers_office');
  }
}

export class DormitoryScene extends BaseExplorationScene {
  constructor() {
    super('DormitoryScene', 'dormitory');
  }
}

export class OldLibraryScene extends BaseExplorationScene {
  constructor() {
    super('OldLibraryScene', 'old_library');
  }
}

export class ForbiddenArchiveScene extends BaseExplorationScene {
  constructor() {
    super('ForbiddenArchiveScene', 'forbidden_archive');
  }
}

export class RooftopScene extends BaseExplorationScene {
  constructor() {
    super('RooftopScene', 'rooftop');
  }
}

export class InfirmaryScene extends BaseExplorationScene {
  constructor() {
    super('InfirmaryScene', 'infirmary');
  }
}
