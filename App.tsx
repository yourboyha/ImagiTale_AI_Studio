
import React, { useState, useEffect, useCallback, ReactNode, useRef } from 'react';

// --- Import Components ---
import HomeScreen from './components/HomeScreen';
import VocabTrainer from './components/VocabTrainer';
import Storybook from './components/Storybook';
import SettingsModal from './components/SettingsModal';
import HomeIcon from './components/icons/HomeIcon';
import SettingsIcon from './components/icons/SettingsIcon';
import AdventureIcon from './components/icons/AdventureIcon';
import HeartwarmingIcon from './components/icons/HeartwarmingIcon';
import FunnyIcon from './components/icons/FunnyIcon';
import DreamyIcon from './components/icons/DreamyIcon';
import MysteryIcon from './components/icons/MysteryIcon';
import RelationshipsIcon from './components/icons/RelationshipsIcon';

// --- Import Types and Constants ---
import { GameState, Language, WordCategory, StoryTone, Word, PreloadedWord } from './types';
import { generateVocabularyList, generateVocabImage } from './services/geminiService';
import { VOCABULARY, WORD_CATEGORY_THAI, STORY_TONE_THAI, MAX_WORDS_PER_ROUND } from './constants';

// --- Helper Components for UI states ---

const ScreenWrapper: React.FC<{ children: ReactNode, title: string }> = ({ children, title }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-purple-50 p-4 sm:p-8 text-center animate-[fade-in_0.5s_ease-out]">
    <div className="bg-white/70 backdrop-blur-md p-6 sm:p-10 rounded-2xl shadow-xl w-full max-w-2xl">
      <h1 className="text-3xl sm:text-4xl font-bold text-purple-700 mb-6">{title}</h1>
      {children}
    </div>
  </div>
);

const ModeSelectionScreen: React.FC<{ onSelect: (lang: Language, cat: WordCategory) => void }> = ({ onSelect }) => {
  const [language, setLanguage] = useState<Language>(Language.TH);
  const [category, setCategory] = useState<WordCategory | null>(null);

  return (
    <ScreenWrapper title="เลือกภาษาและหมวดหมู่">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-gray-700 mb-3">ภาษา (Language)</h2>
        <div className="flex justify-center gap-4">
          <button onClick={() => setLanguage(Language.TH)} className={`px-6 py-3 rounded-lg font-bold transition-all ${language === Language.TH ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700'}`}>ภาษาไทย</button>
          <button onClick={() => setLanguage(Language.EN)} className={`px-6 py-3 rounded-lg font-bold transition-all ${language === Language.EN ? 'bg-purple-600 text-white shadow-lg' : 'bg-gray-200 text-gray-700'}`}>English</button>
        </div>
      </div>
      <div>
        <h2 className="text-xl font-semibold text-gray-700 mb-3">หมวดหมู่คำศัพท์ (Category)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {Object.values(WordCategory).map(cat => (
            <button key={cat} onClick={() => setCategory(cat)} className={`p-4 rounded-lg text-sm sm:text-base font-semibold transition-all ${category === cat ? 'bg-green-500 text-white shadow-lg' : 'bg-gray-200 text-gray-800'}`}>
              {language === Language.TH ? WORD_CATEGORY_THAI[cat] : cat}
            </button>
          ))}
        </div>
      </div>
      {category && (
        <button onClick={() => onSelect(language, category)} className="mt-8 w-full max-w-xs px-8 py-4 bg-orange-500 text-white text-xl font-bold rounded-xl shadow-lg hover:bg-orange-600 transition-all transform hover:scale-105">
          ไปกันเลย!
        </button>
      )}
    </ScreenWrapper>
  );
};

const PreloadingScreen: React.FC<{ progressText: string }> = ({ progressText }) => (
  <div className="w-full h-full flex flex-col items-center justify-center bg-blue-900 text-white p-8">
    <div className="animate-spin rounded-full h-24 w-24 border-t-2 border-b-2 border-yellow-300"></div>
    <h2 className="text-2xl font-bold mt-8">กำลังเตรียมความพร้อม...</h2>
    <p className="mt-2 text-lg">{progressText}</p>
  </div>
);

const StoryToneSelectionScreen: React.FC<{ onSelect: (tone: StoryTone) => void, language: Language }> = ({ onSelect, language }) => {
    const storyToneIcons: Record<StoryTone, React.ReactNode> = {
        [StoryTone.ADVENTURE]: <AdventureIcon />,
        [StoryTone.HEARTWARMING]: <HeartwarmingIcon />,
        [StoryTone.FUNNY]: <FunnyIcon />,
        [StoryTone.DREAMY]: <DreamyIcon />,
        [StoryTone.MYSTERY]: <MysteryIcon />,
        [StoryTone.RELATIONSHIPS]: <RelationshipsIcon />,
    };

    return (
        <ScreenWrapper title={language === Language.TH ? "เลือกแนวของนิทาน" : "Choose a Story Tone"}>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                {Object.values(StoryTone).map(tone => (
                    <button
                        key={tone}
                        onClick={() => onSelect(tone)}
                        className="flex flex-col items-center justify-center gap-2 p-4 rounded-lg bg-purple-100 text-purple-800 font-semibold transition-all hover:bg-purple-200 hover:shadow-lg hover:scale-105"
                    >
                        <div className="text-purple-600">{storyToneIcons[tone]}</div>
                        <span>{language === Language.TH ? STORY_TONE_THAI[tone] : tone}</span>
                    </button>
                ))}
            </div>
        </ScreenWrapper>
    );
};

function App() {
  // --- State Management ---
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [language, setLanguage] = useState<Language>(Language.TH);
  const [wordCategory, setWordCategory] = useState<WordCategory | null>(null);
  const [preloadedWords, setPreloadedWords] = useState<PreloadedWord[]>([]);
  const [fullWordList, setFullWordList] = useState<Word[]>([]);
  const [learnedWords, setLearnedWords] = useState<Word[]>([]);
  const [storyTone, setStoryTone] = useState<StoryTone | null>(null);
  const [progressText, setProgressText] = useState('');
  const [round, setRound] = useState(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // --- Settings / Debug State ---
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(true);
  const [isStoryImageGenerationEnabled, setIsStoryImageGenerationEnabled] = useState(true);
  const [showSkipButton, setShowSkipButton] = useState(false); // Managed by debug mode

  // --- Speech Synthesis State ---
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const speechUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  
  // --- Speech Synthesis Setup ---
  useEffect(() => {
    const loadVoices = () => setVoices(window.speechSynthesis.getVoices());
    window.speechSynthesis.onvoiceschanged = loadVoices;
    loadVoices();
    return () => {
      window.speechSynthesis.onvoiceschanged = null;
      window.speechSynthesis.cancel();
    };
  }, []);
  
  const speak = useCallback((text: string, lang: Language = language) => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    const selectedVoice = voices.find(v => v.lang === lang && v.localService) || voices.find(v => v.lang === lang);
    utterance.voice = selectedVoice || null;
    utterance.lang = lang;
    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    speechUtteranceRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, [voices, language]);

  const stopSpeech = useCallback(() => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
  }, []);

  // --- Game Flow Logic ---
  const preloadVocab = useCallback(async (category: WordCategory) => {
    setProgressText('กำลังหาคำศัพท์...');
    
    // In debug mode, use local vocab. Otherwise, generate.
    const wordsToLoad = isDebugMode
      ? VOCABULARY[category] || []
      : await generateVocabularyList(category);
    
    setFullWordList(wordsToLoad);
    const initialWords = wordsToLoad.slice(0, MAX_WORDS_PER_ROUND);

    setProgressText('กำลังวาดภาพประกอบ...');
    const preloadedData = await Promise.all(
      initialWords.map(async (word, index) => {
        setProgressText(`กำลังวาดภาพประกอบ (${index + 1}/${initialWords.length})...`);
        const imageUrl = isImageGenerationEnabled
          ? await generateVocabImage(word.english)
          : `https://loremflickr.com/400/300/${word.english},illustration,simple?lock=${word.english.replace(/\s/g, '')}`;
        return { word, imageUrl };
      })
    );
    setPreloadedWords(preloadedData);
    setGameState(GameState.VOCAB_TRAINER);
  }, [isDebugMode, isImageGenerationEnabled]);

  useEffect(() => {
    if (gameState === GameState.PRELOADING_VOCAB && wordCategory) {
      preloadVocab(wordCategory);
    }
  }, [gameState, wordCategory, preloadVocab]);

  // --- Event Handlers ---
  const handleStart = () => setGameState(GameState.MODE_SELECTION);
  
  const handleModeSelect = (lang: Language, cat: WordCategory) => {
    setLanguage(lang);
    setWordCategory(cat);
    setGameState(GameState.PRELOADING_VOCAB);
  };
  
  const handleVocabComplete = (words: Word[]) => {
    setLearnedWords(words);
    setGameState(GameState.STORY_TONE_SELECTION);
  };

  const handleToneSelect = (tone: StoryTone) => {
    setStoryTone(tone);
    setGameState(GameState.STORY);
  };

  const handleStoryComplete = () => {
    // Reset for a new game
    setGameState(GameState.HOME);
    setWordCategory(null);
    setPreloadedWords([]);
    setFullWordList([]);
    setLearnedWords([]);
    setStoryTone(null);
    setRound(prev => prev + 1);
  };
  
  const handleGoHome = () => {
      stopSpeech();
      handleStoryComplete();
  };

  // --- Main Render Logic ---
  const renderGameState = () => {
    switch (gameState) {
      case GameState.HOME:
        return <HomeScreen onStart={handleStart} />;
      case GameState.MODE_SELECTION:
        return <ModeSelectionScreen onSelect={handleModeSelect} />;
      case GameState.PRELOADING_VOCAB:
        return <PreloadingScreen progressText={progressText} />;
      case GameState.VOCAB_TRAINER:
        return (
          <VocabTrainer
            onComplete={handleVocabComplete}
            round={round}
            language={language}
            initialData={preloadedWords}
            fullWordList={fullWordList}
            isImageGenerationEnabled={isImageGenerationEnabled}
            speak={(text) => speak(text, language)}
            stopSpeech={stopSpeech}
            isSpeaking={isSpeaking}
          />
        );
      case GameState.STORY_TONE_SELECTION:
          return <StoryToneSelectionScreen onSelect={handleToneSelect} language={language}/>
      case GameState.STORY:
        return (
          <Storybook
            words={learnedWords}
            onComplete={handleStoryComplete}
            language={language}
            storyTone={storyTone!}
            isImageGenerationEnabled={isStoryImageGenerationEnabled}
            speak={(text) => speak(text, language)}
            stopSpeech={stopSpeech}
            isSpeaking={isSpeaking}
          />
        );
      default:
        return <HomeScreen onStart={handleStart} />;
    }
  };

  const showNav = gameState !== GameState.HOME && gameState !== GameState.PRELOADING_VOCAB;

  return (
    <div className="w-screen h-screen bg-gray-100 font-sans relative overflow-hidden">
      {renderGameState()}
      
      {showNav && (
        <div className="absolute top-2 right-2 sm:top-4 sm:right-4 flex gap-2 z-20">
            <button onClick={handleGoHome} className="p-2 bg-white/70 rounded-full shadow-md hover:bg-white transition-colors" aria-label="Go Home">
                <HomeIcon/>
            </button>
            <button onClick={() => setIsSettingsOpen(true)} className="p-2 bg-white/70 rounded-full shadow-md hover:bg-white transition-colors" aria-label="Settings">
                <SettingsIcon />
            </button>
        </div>
      )}
      
      {isDebugMode && showSkipButton && gameState === GameState.VOCAB_TRAINER && (
        <button
          onClick={() => handleVocabComplete(preloadedWords.map(p => p.word))}
          className="absolute bottom-4 right-4 bg-red-500 text-white font-bold py-2 px-4 rounded-lg shadow-lg z-20"
        >
          Skip Vocab
        </button>
      )}

      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        isDebugMode={isDebugMode}
        setIsDebugMode={setIsDebugMode}
        isImageGenerationEnabled={isImageGenerationEnabled}
        setIsImageGenerationEnabled={setIsImageGenerationEnabled}
        isStoryImageGenerationEnabled={isStoryImageGenerationEnabled}
        setIsStoryImageGenerationEnabled={setIsStoryImageGenerationEnabled}
        showSkipButton={showSkipButton}
        setShowSkipButton={setShowSkipButton}
      />
    </div>
  );
}

export default App;