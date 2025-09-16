export enum GameState {
  HOME,
  MODE_SELECTION,
  PRELOADING_VOCAB,
  VOCAB_TRAINER,
  STORY_TONE_SELECTION,
  STORY,
}

export enum Language {
  TH = 'th-TH',
  EN = 'en-US',
}

export enum WordCategory {
  ANIMALS_NATURE = "Animals & Nature",
  FAMILY_PEOPLE = "Family & People",
  FOOD_DRINK = "Food & Drink",
  THINGS_TOYS = "Things & Toys",
  PLACES_ENVIRONMENT = "Places & Environment",
  ACTIONS_EMOTIONS = "Actions & Emotions",
}

export enum StoryTone {
  ADVENTURE = "Adventure",
  HEARTWARMING = "Heartwarming & Moral",
  FUNNY = "Funny & Humorous",
  DREAMY = "Dreamy & Imaginative",
  MYSTERY = "Mystery & Discovery",
  RELATIONSHIPS = "Relationships",
}

export interface Word {
  thai: string;
  english: string;
}

export interface PreloadedWord {
  word: Word;
  imageUrl: string;
}

export interface StoryScene {
  text: string;
  imageUrl: string;
  choices?: string[];
}
