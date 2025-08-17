import React, { useState, useCallback } from 'react';
import { GameState, StorySegment, StoryHistoryItem, Language } from './types';
import { generateAdventureStep, generateImage } from './services/geminiService';
import StartScreen from './components/StartScreen';
import GameScreen from './components/GameScreen';
import GameOverScreen from './components/GameOverScreen';
import LoadingIndicator from './components/LoadingIndicator';
import { locales } from './locales';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [currentStory, setCurrentStory] = useState<StorySegment | null>(null);
  const [storyHistory, setStoryHistory] = useState<StoryHistoryItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState<Language>('en');

  const t = locales[language];

  const resetGame = () => {
    setGameState(GameState.START);
    setCurrentStory(null);
    setStoryHistory([]);
    setError(null);
  };
  
  const handleStartGame = useCallback(async (selectedLanguage: Language) => {
    setLanguage(selectedLanguage);
    setGameState(GameState.LOADING);
    setError(null);
    try {
      const storyResponse = await generateAdventureStep(selectedLanguage);
      if (!storyResponse) {
          throw new Error("Failed to start the story.");
      }
      const image = await generateImage(storyResponse.imagePrompt);

      setCurrentStory({
        sceneDescription: storyResponse.sceneDescription,
        choices: storyResponse.choices,
        image,
      });

      setStoryHistory([{ scene: storyResponse.sceneDescription, choice: "The analysis begins..." }]);
      setGameState(GameState.PLAYING);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setGameState(GameState.ERROR);
    }
  }, []);

  const handleChoice = useCallback(async (choice: string) => {
    setGameState(GameState.LOADING);
    setError(null);

    const newHistory: StoryHistoryItem[] = [...storyHistory, { scene: currentStory?.sceneDescription || '', choice }];
    setStoryHistory(newHistory);

    try {
      const storyResponse = await generateAdventureStep(language, newHistory, choice);
       if (!storyResponse) {
          throw new Error("Failed to continue the story.");
      }
      const image = await generateImage(storyResponse.imagePrompt);

      setCurrentStory({
        sceneDescription: storyResponse.sceneDescription,
        choices: storyResponse.choices,
        image,
      });

      if (storyResponse.choices.length === 0) {
        setGameState(GameState.GAME_OVER);
      } else {
        setGameState(GameState.PLAYING);
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
      setGameState(GameState.ERROR);
    }
  }, [storyHistory, currentStory, language]);


  const renderContent = () => {
    switch (gameState) {
      case GameState.START:
        return <StartScreen onStart={handleStartGame} />;
      case GameState.PLAYING:
      case GameState.LOADING: // Show game screen underneath loading overlay
        return currentStory ? (
          <GameScreen
            story={currentStory}
            onChoice={handleChoice}
            isLoading={gameState === GameState.LOADING}
            language={language}
          />
        ) : <LoadingIndicator />;
      case GameState.GAME_OVER:
         return currentStory ? (
           <GameOverScreen finalScene={currentStory} onRestart={resetGame} language={language} />
         ) : null;
      case GameState.ERROR:
        return (
          <div className="text-center text-red-400">
            <h2 className="text-2xl font-bold mb-4">{t.errorTitle}</h2>
            <p>{error}</p>
            <button
              onClick={resetGame}
              className="mt-6 bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
            >
              {t.errorTryAgain}
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-gray-900 text-gray-200 min-h-screen flex flex-col items-center justify-center p-4">
       {gameState === GameState.LOADING && <LoadingIndicator />}
       <div className="w-full max-w-6xl mx-auto">
        {renderContent()}
       </div>
    </div>
  );
};

export default App;
