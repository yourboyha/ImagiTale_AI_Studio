
export enum Language {
  EN = 'en-US',
  TH = 'th-TH',
}

export enum WordCategory {
  ANIMALS_NATURE = "animals_nature",
  FAMILY_PEOPLE = "family_people",
  FOOD_DRINK = "food_drink",
  THINGS_TOYS = "things_toys",
  PLACES_ENVIRONMENT = "places_environment",
  ACTIONS_EMOTIONS = "actions_emotions",
}

export interface Word {
  thai: string;
  english: string;
}

export interface PreloadedWord {
  word: Word;
  imageUrl: string;
}

export enum StoryTone {
  ADVENTURE = "adventure",
  HEARTWARMING = "heartwarming",
  FUNNY = "funny",
  DREAMY = "dreamy",
  MYSTERY = "mystery",
  RELATIONSHIPS = "relationships",
}

export enum AIVoice {
  ZEPHYR = "Zephyr",
  PUCK = "Puck",
  CHARON = "Charon",
  KORE = "Kore",
  FENRIR = "Fenrir",
  LEDA = "Leda",
  ORUS = "Orus",
  AOEDE = "Aoede",
}

export interface StoryScene {
  text: string;
  imageUrl: string;
  choices: string[];
}