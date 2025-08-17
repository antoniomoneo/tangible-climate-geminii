export type Language = 'en' | 'es';

export enum GameState {
  START,
  LOADING,
  PLAYING,
  GAME_OVER,
  ERROR,
}

export interface StorySegment {
  sceneDescription: string;
  image: string;
  choices: string[];
}

export interface StoryHistoryItem {
  scene: string;
  choice: string;
}

export interface GeminiStoryResponse {
  sceneDescription: string;
  imagePrompt: string;
  choices: string[];
}
