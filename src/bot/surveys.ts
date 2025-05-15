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

export interface NumberTelegramQuestion {
  question: string;
  key: string;
  type: 'number';
}

export type TelegramQuestion =
  | RangeTelegramQuestion
  | BooleanTelegramQuestion
  | HeaderTelegramQuestion
  | TextTelegramQuestion
  | NumberTelegramQuestion;

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
  },
  {
    reminder: 'daily',
    key: 'asleep',
    questions: [
      {
        key: 'alcoholIntake',
        question: 'How much alcohol did you drink today?',
        type: 'range',
        buttons: {
          '5': 'No alcohol',
          '4': 'Had 1 drink',
          '3': 'Had 2 drinks',
          '2': 'Had 3 drinks',
          '1': 'Had 4-5 drinks',
          '0': 'Got wasted',
        },
      },
      {
        key: 'energy',
        question: 'Have you felt energized overall today?',
        type: 'range',
        buttons: {
          '5': 'Felt full of energy',
          '4': 'Great energy',
          '3': 'Good energy',
          '2': 'Average energy',
          '1': 'Felt tired/sluggish',
          '0': "Didn't feel like doing a lot",
        },
      },
      {
        key: 'stress',
        question: 'Did you feel stressed today?',
        type: 'range',
        buttons: {
          '5': 'Very calm and aware',
          '4': 'Calm & relaxed',
          '3': 'Neutral',
          '2': 'Lots to do',
          '1': 'Stressed & Overwhelmed',
          '0': 'Very stressed, not sure where to start',
        },
      },
      {
        key: 'nap',
        question: 'Did you nap today?',
        type: 'boolean',
      },
      {
        key: 'dailySteps',
        question: 'How many steps did you take according to Apple Health?',
        type: 'number',
      },
    ],
  },
];
