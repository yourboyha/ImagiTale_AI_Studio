import React, { useState, useCallback, useEffect, useRef } from 'react';
import HomeScreen from './components/HomeScreen';
import VocabTrainer from './components/VocabTrainer';
import Storybook from './components/Storybook';
import SettingsModal from './components/SettingsModal';
import SettingsIcon from './components/icons/SettingsIcon';
import { GameScreen, Language, StoryTone, AIVoice, Word } from './types';

// This is our new single point of contact with our secure backend.
const API_ENDPOINT = '/.netlify/functions/generate-speech';

const App: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<GameScreen>(GameScreen.HOME);
  const [selectedWords, setSelectedWords] = useState<Word[]>([]);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [language, setLanguage] = useState<Language>(Language.TH);
  const [storyTone, setStoryTone] = useState<StoryTone>(StoryTone.ADVENTURE);
  const [aiVoice, setAiVoice] = useState<AIVoice>(AIVoice.AURORA);
  const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(true);

  // Audio State
  const [isSpeaking, setIsSpeaking] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  
  // Sound Effects
  const menuSoundRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Preload audio element for sound effects
    // Note: A sound file needs to be placed at /public/sounds/menu-select.wav for this to work.
    try {
      menuSoundRef.current = new Audio('/sounds/menu-select.wav');
      menuSoundRef.current.volume = 0.5;
    } catch (error) {
      console.warn("Could not load menu sound effect.", error);
    }
  }, []);

  const playMenuSound = () => {
    menuSoundRef.current?.play().catch(e => console.error("Error playing menu sound:", e));
  };
  
  const speak = useCallback(async (text: string) => {
    if (isSpeaking || !text) return;
    setIsSpeaking(true);
    try {
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'generateGeminiSpeech',
          payload: { text, voice: aiVoice, language }
        }),
      });
      if (!response.ok) throw new Error('Failed to generate speech');
      const { audioContent, mimeType } = await response.json();
      
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
      }
      
      audioRef.current = new Audio(`data:${mimeType};base64,${audioContent}`);
      await audioRef.current.play();

      audioRef.current.onended = () => {
        setIsSpeaking(false);
      };
      
    } catch (error) {
      console.error('Speech generation failed:', error);
      setIsSpeaking(false);
    }
  }, [aiVoice, language, isSpeaking]);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);

  const handleStart = () => {
    playMenuSound();
    setCurrentScreen(GameScreen.VOCAB);
  };
  
  const handleVocabComplete = (words: Word[]) => {
    playMenuSound();
    setSelectedWords(words);
    setCurrentScreen(GameScreen.STORY);
  };

  const handleStoryComplete = () => {
    playMenuSound();
    setCurrentScreen(GameScreen.HOME);
    setSelectedWords([]);
  };
  
  const renderScreen = () => {
    switch (currentScreen) {
      case GameScreen.HOME:
        return <HomeScreen onStart={handleStart} />;
      case GameScreen.VOCAB:
        return <VocabTrainer onComplete={handleVocabComplete} language={language} />;
      case GameScreen.STORY:
        return <Storybook 
          words={selectedWords} 
          onComplete={handleStoryComplete} 
          language={language}
          storyTone={storyTone}
          isImageGenerationEnabled={isImageGenerationEnabled}
          speak={speak}
          stopSpeech={stopSpeech}
          isSpeaking={isSpeaking}
        />;
      default:
        return <HomeScreen onStart={handleStart} />;
    }
  };

  return (
    <div className="w-screen h-screen bg-gray-900 font-sans">
      {renderScreen()}
      <button
        onClick={() => {
          playMenuSound();
          setIsSettingsOpen(true);
        }}
        className="fixed top-4 right-4 z-40 p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg text-purple-700 hover:bg-white hover:scale-110 transition-all"
        aria-label="Open settings"
      >
        <SettingsIcon />
      </button>
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        language={language}
        setLanguage={setLanguage}
        storyTone={storyTone}
        setStoryTone={setStoryTone}
        aiVoice={aiVoice}
        setAiVoice={setAiVoice}
        isImageGenerationEnabled={isImageGenerationEnabled}
        setIsImageGenerationEnabled={setIsImageGenerationEnabled}
        playMenuSound={playMenuSound}
      />
    </div>
  );
};

export default App;
