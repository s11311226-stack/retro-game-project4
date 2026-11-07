import type { StoryEventDef, StoryEventId } from '../types';

export const DEMO_CHAPTER_TITLE = '體驗版章節：點名簿上不存在的人';

export const INITIAL_OBJECTIVE_TEXT =
  '目標：探索校門與中庭公告欄，查明夜間入學通知與失蹤學生海報的異常。';

/**
 * 體驗版單一結局短篇劇本定義
 * 所有劇情觸發皆以明確的事件 ID (`StoryEventId`) 與劇情旗標 (`StoryFlagId`) 控制，
 * 絕不依賴容易變動的場景 X/Y 座標，並確保場景切換或重載時不會重複觸發。
 */
export const DEMO_STORY_EVENTS: Record<StoryEventId, StoryEventDef> = {
  evt_chapter1_opening_intro: {
    id: 'evt_chapter1_opening_intro',
    chapterTitle: DEMO_CHAPTER_TITLE,
    triggerCondition: {
      requiredFlags: [],
      forbiddenFlags: ['flag_intro_played'],
      triggerOnAreaEnter: 'school_gate',
    },
    setFlagsOnComplete: ['flag_intro_played'],
    dialogueLines: [
      {
        speaker: '入學女學生（主角）',
        portraitTag: 'protagonist',
        text: '「這裡就是『無名高級中學』嗎……入學通知書上要求我在十一月七日夜晚獨自到校報到。」',
      },
      {
        speaker: '入學女學生（主角）',
        portraitTag: 'protagonist',
        text: '「校門鐵欄上的銘牌寫著『西元 2004 年正式啟用』，但整座校園卻冷清得像荒廢了十幾年。」',
      },
      {
        speaker: '入學女學生（主角）',
        portraitTag: 'protagonist',
        text: '「先查看校門邊的【入學通知】，再前往【公告欄區域】確認分班名冊與海報吧。」',
      },
    ],
    presentationEffect: 'none',
    nextObjectiveText:
      '目標：前往「公告欄區域」調查失蹤學生海報，並尋找進入三年丙班教室的方法。',
  },

  evt_bulletin_poster_reflection: {
    id: 'evt_bulletin_poster_reflection',
    chapterTitle: DEMO_CHAPTER_TITLE,
    triggerCondition: {
      requiredFlags: ['flag_missing_poster_found'],
      forbiddenFlags: ['flag_anachronistic_file_read'],
      triggerAfterObjectClosed: 'doc_missing_student_poster',
    },
    setFlagsOnComplete: [],
    dialogueLines: [
      {
        speaker: '入學女學生（主角）',
        portraitTag: 'protagonist',
        text: '「奇怪……這張失蹤海報上的女學生叫『林曉月』，上面寫她是三年丙班第 30 號學生。」',
      },
      {
        speaker: '入學女學生（主角）',
        portraitTag: 'protagonist',
        text: '「可是公告欄貼出的三年丙班正式名冊只有 29 個人，名冊上根本不存在『林曉月』這個名字！」',
      },
      {
        speaker: '入學女學生（主角）',
        portraitTag: 'protagonist',
        text: '「我得拿取長椅下的備用鑰匙，親自去走廊盡頭的【三年丙班教室】調查裡面的校務文件。」',
      },
    ],
    presentationEffect: 'none',
    nextObjectiveText:
      '目標：拾取公告欄長椅下的「生鏽的三年丙班鑰匙」，前往走廊開啟「三年丙班教室門」。',
  },

  evt_classroom_entry_reflection: {
    id: 'evt_classroom_entry_reflection',
    chapterTitle: DEMO_CHAPTER_TITLE,
    triggerCondition: {
      requiredFlags: ['flag_classroom_entered'],
      forbiddenFlags: ['flag_anachronistic_file_read'],
      triggerOnAreaEnter: 'classroom',
    },
    setFlagsOnComplete: [],
    dialogueLines: [
      {
        speaker: '入學女學生（主角）',
        portraitTag: 'protagonist',
        text: '「這裡就是被鎖住的三年丙班教室……明明名冊只有 29 人，角落卻擺著第 30 張課桌。」',
      },
      {
        speaker: '入學女學生（主角）',
        portraitTag: 'protagonist',
        text: '「課桌與講台之間放著一份封存的【神祕校務文件】，過去翻開看看吧。」',
      },
    ],
    presentationEffect: 'none',
    nextObjectiveText:
      '目標：在三年丙班教室中調查課桌、黑板與「神祕校務文件」。',
  },

  evt_anomaly_new_student_observed: {
    id: 'evt_anomaly_new_student_observed',
    chapterTitle: DEMO_CHAPTER_TITLE,
    triggerCondition: {
      requiredFlags: [
        'flag_missing_poster_found',
        'flag_anachronistic_file_read',
      ],
      forbiddenFlags: ['flag_anomaly_observation_triggered'],
      triggerAfterObjectClosed: 'doc_mysterious_school_file',
    },
    setFlagsOnComplete: [
      'flag_anomaly_observation_triggered',
      'flag_demo_completed',
    ],
    dialogueLines: [
      {
        speaker: '入學女學生（主角）',
        portraitTag: 'protagonist',
        text: '「怎麼可能……這份校務文件的發文日期是『1998 年 11 月 7 日』，比學校正式啟用的 2004 年還早了六年！」',
      },
      {
        speaker: '入學女學生（主角）',
        portraitTag: 'protagonist',
        text: '「而且上面清楚列著不在班級名冊上的第 30 號學生『林曉月』……等等，教室的燈光怎麼突然在閃？！」',
      },
      {
        speaker: '【神祕校務文件・異變訊息】',
        portraitTag: 'mystery',
        text: '（畫面劇烈閃爍，文件紙頁自動翻動，浮現一行血紅色的印刷字跡——）\n『認知同步率 100%：新生已完成觀察。』',
      },
      {
        speaker: '【校內廣播雜訊】',
        portraitTag: 'system',
        text: '「滋……滋……三年丙班第 31 號座位，入學手續已確認。歡迎加入點名簿。」',
      },
    ],
    presentationEffect: 'screen_flicker_anomaly',
    nextObjectiveText:
      '體驗版調查完成：「新生已完成觀察」——即將進入體驗版通關結算畫面。',
  },

  evt_demo_ending_complete: {
    id: 'evt_demo_ending_complete',
    chapterTitle: DEMO_CHAPTER_TITLE,
    triggerCondition: {
      requiredFlags: ['flag_demo_completed'],
    },
    setFlagsOnComplete: ['flag_demo_completed'],
    dialogueLines: [],
    presentationEffect: 'transition_to_ending',
  },
};
