export interface RangeTelegramQuestion {
  question: string;
  key: string;
  type: 'range';
  buttons?: Record<string, string>;
}

export interface BooleanTelegramQuestion {
  question: string;
  key: string;
  type: 'boolean';
}

export interface HeaderTelegramQuestion {
  question: string;
  type: 'header';
}

export interface TextTelegramQuestion {
  question: string;
  key: string;
  type: 'text';
  regex?: RegExp;
}

export type TelegramQuestion =
  | RangeTelegramQuestion
  | BooleanTelegramQuestion
  | HeaderTelegramQuestion
  | TextTelegramQuestion;

export interface TelegramSurvey {
  key: string;
  reminder: 'daily' | 'every3hours';
  questions: TelegramQuestion[];
}

// TODO: reminders in scheduler
export const surveys: TelegramSurvey[] = [
  {
    reminder: 'every3hours',
    key: 'mood',
    questions: [
      {
        type: 'range',
        question: 'How are you feeling today?',
        key: 'mood',
        buttons: {
          '5': 'pumped, energized',
          '4': 'happy, excited',
          '3': 'good',
          '2': 'okay',
          '1': 'sad, unhappy',
          '0': 'nervous, bad',
        },
      },
    ],
  },
  {
    reminder: 'daily',
    key: 'awake',
    questions: [
      {
        question: '🌇 Good morning',
        type: 'header',
      },
      {
        key: 'sleepQuality',
        question: 'How would you rate your quality of sleep?',
        type: 'range',
        buttons: {
          '5': 'Excellent, feeling refreshed',
          '4': 'Great, feeling good',
          '3': 'Good, slighty above average',
          '2': 'Solid, slightly tired',
          '1': 'Tired, restless sleep',
          '0': 'Miserable',
        },
      },
      {
        key: 'watchTimeAsleep',
        question: 'How many hours asleep were you according to your Watch?',
        type: 'text',
        regex: /\d?\d:\d\d/,
      },
    ],
    // TODO: evening quiz, reference https://github.com/KrauseFx/FxLifeSheet/blob/master/lifesheet.json
  },
];
