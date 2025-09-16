import React, { useState, useEffect, useCallback, useRef } from 'react';
import HomeScreen from './components/HomeScreen';
import VocabTrainer from './components/VocabTrainer';
import Storybook from './components/Storybook';
import SettingsModal from './components/SettingsModal';
import SettingsIcon from './components/icons/SettingsIcon';
import HomeIcon from './components/icons/HomeIcon';
import { Language, StoryTone, Word, WordCategory, PreloadedWord, AIVoice } from './types';
import { VOCABULARY, MAX_WORDS_PER_ROUND } from './constants';
import { generateVocabularyList, generateVocabImage } from './services/geminiService';

type GameState = 'home' | 'vocab' | 'story';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('home');
  const [round, setRound] = useState(1);
  const [collectedWords, setCollectedWords] = useState<Word[]>([]);
  const [language, setLanguage] = useState<Language>(Language.TH);
  const [storyTone, setStoryTone] = useState<StoryTone>(StoryTone.ADVENTURE);
  const [aiVoice, setAiVoice] = useState<AIVoice>(AIVoice.ZEPHYR);
  const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  
  const [preloadedData, setPreloadedData] = useState<PreloadedWord[]>([]);
  const [fullWordList, setFullWordList] = useState<Word[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [progressText, setProgressText] = useState('');

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(false);

  // New speech synthesis system using backend
  const speak = useCallback(async (text: string) => {
    if (!text) return;
    setIsSpeaking(true);
    try {
      const response = await fetch('/.netlify/functions/generate-speech', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          task: 'generateGeminiSpeech',
          payload: { text, voice: aiVoice, language }
        }),
      });
      if (!response.ok) throw new Error(`Speech generation failed with status: ${response.status}`);
      const { audioContent, mimeType } = await response.json();
      
      const audioSrc = `data:${mimeType};base64,${audioContent}`;
      if (audioRef.current) {
        audioRef.current.src = audioSrc;
        audioRef.current.play().catch(e => console.error("Audio playback failed:", e));
      }
    } catch (error) {
      console.error("Error fetching TTS audio:", error);
      setIsSpeaking(false);
    }
  }, [aiVoice, language]);

  const stopSpeech = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
    }
    setIsSpeaking(false);
  }, []);
  
  // Sequential data preloader to avoid rate limiting
  const preloadDataForVocabTrainer = useCallback(async () => {
    setIsLoading(true);
    setProgressText('AI กำลังเลือกคำศัพท์สนุกๆ ให้คุณ!');
    const categories = Object.values(WordCategory);
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];

    let words: Word[];
    try {
      words = await generateVocabularyList(randomCategory);
    } catch (e) {
      console.error("Failed to generate vocab, using fallback", e);
      words = VOCABULARY[randomCategory];
    }
    setFullWordList(words);

    const wordsToPreload = words.slice(0, MAX_WORDS_PER_ROUND);
    const preloadedItems: PreloadedWord[] = [];

    for (const word of wordsToPreload) {
      setProgressText(`กำลังสร้างรูปภาพสำหรับ '${language === Language.TH ? word.thai : word.english}'...`);
      const imageUrl = isImageGenerationEnabled
        ? await generateVocabImage(word.english)
        : `https://loremflickr.com/400/300/${word.english},illustration,simple?lock=${word.english.replace(/\s/g, '')}`;
      preloadedItems.push({ word, imageUrl });
    }
    
    setPreloadedData(preloadedItems);
    setIsLoading(false);
    setProgressText('');
  }, [isImageGenerationEnabled, language]);


  useEffect(() => {
    if (gameState === 'vocab' && preloadedData.length === 0) {
      preloadDataForVocabTrainer();
    }
  }, [gameState, preloadedData.length, preloadDataForVocabTrainer]);

  const handleStart = () => {
    setGameState('vocab');
  };

  const handleVocabComplete = (words: Word[]) => {
    setCollectedWords(words);
    setGameState('story');
  };

  const handleStoryComplete = () => {
    setRound(prev => prev + 1);
    setCollectedWords([]);
    setPreloadedData([]);
    setGameState('vocab');
  };

  const handleGoHome = () => {
    stopSpeech();
    setGameState('home');
    setRound(1);
    setCollectedWords([]);
    setPreloadedData([]);
  }

  const renderGameState = () => {
    if (isLoading && gameState === 'vocab') {
       return (
        <div className="w-full h-full flex flex-col items-center justify-center bg-purple-100 text-purple-800 p-8 text-center">
            <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-b-2 border-purple-500"></div>
            <h2 className="text-2xl font-bold mt-6">กำลังเตรียมคำศัพท์...</h2>
            <p className="mt-2 text-md">{progressText}</p>
        </div>
       );
    }

    switch (gameState) {
      case 'vocab':
        return <VocabTrainer 
          onComplete={handleVocabComplete} 
          round={round} 
          language={language}
          initialData={preloadedData}
          fullWordList={fullWordList}
          isImageGenerationEnabled={isImageGenerationEnabled}
          speak={speak}
          stopSpeech={stopSpeech}
          isSpeaking={isSpeaking}
        />;
      case 'story':
        return <Storybook 
          words={collectedWords} 
          onComplete={handleStoryComplete} 
          language={language}
          storyTone={storyTone}
          isImageGenerationEnabled={isImageGenerationEnabled}
          speak={speak}
          stopSpeech={stopSpeech}
          isSpeaking={isSpeaking}
        />;
      case 'home':
      default:
        return <HomeScreen onStart={handleStart} />;
    }
  };

  return (
    <div id="app-container" className="w-screen h-screen bg-gray-800 font-sans">
      <audio ref={audioRef} onEnded={() => setIsSpeaking(false)} onError={() => setIsSpeaking(false)} hidden />
      <main className="w-full h-full">
        {renderGameState()}
      </main>
      <div className="absolute top-4 right-4 z-50 flex gap-2">
        {gameState !== 'home' && (
          <button onClick={handleGoHome} className="p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors" aria-label="Go home">
            <HomeIcon />
          </button>
        )}
        <button onClick={() => setIsSettingsOpen(true)} className="p-3 bg-white/80 backdrop-blur-sm rounded-full shadow-lg hover:bg-white transition-colors" aria-label="Settings">
          <SettingsIcon />
        </button>
      </div>

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
      />
    </div>
  );
};

export default App;