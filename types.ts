export enum Language {
  TH = 'th',
  EN = 'en',
}

export enum GameScreen {
  HOME = 'home',
  VOCAB = 'vocab',
  STORY = 'story',
}

export enum WordCategory {
  ANIMALS_NATURE = "Animals & Nature",
  FAMILY_PEOPLE = "Family & People",
  FOOD_DRINK = "Food & Drink",
  THINGS_TOYS = "Things & Toys",
  PLACES_ENVIRONMENT = "Places & Environment",
  ACTIONS_EMOTIONS = "Actions & Emotions",
}

export interface Word {
  thai: string;
  english: string;
}

export enum StoryTone {
  ADVENTURE = "Adventure",
  HEARTWARMING = "Heartwarming",
  FUNNY = "Funny",
  DREAMY = "Dreamy",
  MYSTERY = "Mystery",
  RELATIONSHIPS = "Relationships",
}

export interface StoryScene {
  text: string;
  imageUrl: string;
  choices: string[];
}

export enum AIVoice {
  AURORA = "aurora",
  JUNIPER = "juniper",
  LUNA = "luna",
  ORION = "orion",
  EMBER = "ember",
}
