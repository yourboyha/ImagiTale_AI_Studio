
import React, { useState, useCallback, useEffect, useRef } from 'react';
import { GameState, Word, WordCategory, Language, PreloadedWord, StoryTone, AIPersonality } from './types';
import { VOCABULARY, WORD_CATEGORY_THAI, MAX_WORDS_PER_ROUND, STORY_TONE_THAI } from './constants';
import { generateVocabImage, generateVocabularyList } from './services/geminiService';
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

// Component for the new Mode Selection Screen, defined within App.tsx to adhere to file constraints.
interface ModeSelectionScreenProps {
  onStart: (language: Language, category: WordCategory) => void;
  onSkip: (language: Language, category: WordCategory) => void;
  showSkipButton: boolean;
  speak: (text: string, lang: Language) => Promise<void>;
}
const ModeSelectionScreen: React.FC<ModeSelectionScreenProps> = ({ onStart, onSkip, showSkipButton, speak }) => {
  const [language, setLanguage] = useState<Language>(Language.TH);
  const [category, setCategory] = useState<WordCategory>(WordCategory.ANIMALS_NATURE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => { isComponentMounted.current = false; };
  }, []);

  const handleOptionClick = async (value: any, type: 'lang' | 'cat', textToSpeak: string) => {
    if (isSpeaking) return;

    setIsSpeaking(true);
    await speak(textToSpeak, type === 'lang' ? value : language);

    if (isComponentMounted.current) {
      if (type === 'lang') {
        setLanguage(value);
      } else {
        setCategory(value);
      }
      setIsSpeaking(false);
    }
  };

  return (
     <div className="w-full h-full grid place-items-center text-center p-8 overflow-y-auto">
      <div className="w-full max-w-2xl">
        <h2 className="text-4xl font-bold text-purple-700 mb-6">เลือกการผจญภัยของคุณ!</h2>
        
        <div className="mb-8">
            <h3 className="text-2xl font-semibold text-gray-700 mb-3">1. เลือกภาษาที่จะฝึก</h3>
            <div className="flex justify-center gap-4">
                {Object.values(Language).map(lang => {
                  const langText = lang === Language.TH ? 'ภาษาไทย' : 'English';
                  const isSelected = language === lang;
                  return (
                    <button key={lang} onClick={() => handleOptionClick(lang, 'lang', langText)} disabled={isSpeaking} className={`relative px-8 py-3 rounded-full text-xl font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isSelected ? 'bg-purple-600 text-white shadow-lg scale-105' : 'bg-white hover:bg-purple-100'}`}>
                      <span>{langText}</span>
                    </button>
                  );
                })}
            </div>
        </div>

        <div className="mb-10">
            <h3 className="text-2xl font-semibold text-gray-700 mb-4">2. เลือกหมวดหมู่คำศัพท์</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {Object.values(WordCategory).map(cat => {
                    const catText = WORD_CATEGORY_THAI[cat];
                    const isSelected = category === cat;
                    return (
                      <button key={cat} onClick={() => handleOptionClick(cat, 'cat', catText)} disabled={isSpeaking} className={`relative p-4 rounded-xl font-semibold text-center transition-all disabled:opacity-60 disabled:cursor-not-allowed ${isSelected ? 'bg-yellow-400 text-gray-800 shadow-lg scale-105' : 'bg-white hover:bg-yellow-100'}`}>
                         <span>{catText}</span>
                      </button>
                    );
                })}
            </div>
        </div>
        
        <button onClick={() => onStart(language, category)} disabled={isSpeaking} className="w-full px-10 py-5 bg-green-500 text-white text-3xl font-bold rounded-2xl shadow-2xl hover:bg-green-600 transform hover:scale-105 transition-all duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed">
            ไปกันเลย!
        </button>
        {showSkipButton && (
          <button onClick={() => onSkip(language, category)} disabled={isSpeaking} className="mt-4 w-full px-8 py-3 bg-gray-600 text-white text-lg font-semibold rounded-xl shadow-lg hover:bg-gray-700 transition-all disabled:opacity-60 disabled:cursor-not-allowed">
              ข้ามไปที่โหมดนิทาน (Debug)
          </button>
        )}
      </div>
    </div>
  );
};

// Component for preloading vocab images.
interface VocabPreloaderProps {
  category: WordCategory;
  onComplete: (data: { preloadedData: PreloadedWord[]; shuffledFullList: Word[] }) => void;
  isImageGenerationEnabled: boolean;
}
const VocabPreloader: React.FC<VocabPreloaderProps> = ({ category, onComplete, isImageGenerationEnabled }) => {
  useEffect(() => {
    const preload = async () => {
      // 1. Generate or fetch the word list for the category.
      const wordList = isImageGenerationEnabled
        ? await generateVocabularyList(category)
        : [...VOCABULARY[category]]; // Use constant list if AI generation is off

      // 2. Shuffle the full list to randomize the order of words
      for (let i = wordList.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [wordList[i], wordList[j]] = [wordList[j], wordList[i]];
      }
      
      const wordsForRound = wordList.slice(0, MAX_WORDS_PER_ROUND);

      // 3. Generate images for the initial words sequentially to avoid rate limiting
      const preloadedData: PreloadedWord[] = [];
      for (const word of wordsForRound) {
        const imageUrl = isImageGenerationEnabled
            ? await generateVocabImage(word.english)
            : `https://picsum.photos/seed/${word.english}/400/300`;
        preloadedData.push({ word, imageUrl });
      }
      
      onComplete({ preloadedData, shuffledFullList: wordList });
    };

    preload();
  }, [category, onComplete, isImageGenerationEnabled]);

  return (
    <div className="w-full h-full grid place-items-center text-center p-8 text-purple-700 overflow-y-auto">
      <div>
        <div className="animate-spin rounded-full h-24 w-24 border-t-4 border-b-4 border-yellow-400 mx-auto"></div>
        <h2 className="text-3xl font-bold mt-8">กำลังเตรียมคำศัพท์...</h2>
        <p className="mt-2 text-lg">AI กำลังร้อยเรียงคำศัพท์สำหรับนิทานของคุณ!</p>
      </div>
    </div>
  );
};

// Component for Story Tone Selection
interface StoryToneSelectionScreenProps {
  onSelect: (tone: StoryTone) => void;
  speak: (text: string, lang: Language) => Promise<void>;
  currentLanguage: Language;
}
const StoryToneSelectionScreen: React.FC<StoryToneSelectionScreenProps> = ({ onSelect, speak, currentLanguage }) => {
  const [selectedTone, setSelectedTone] = useState<StoryTone>(StoryTone.ADVENTURE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const isComponentMounted = useRef(true);

  useEffect(() => {
    isComponentMounted.current = true;
    return () => { isComponentMounted.current = false; };
  }, []);

  const toneDetails: Record<StoryTone, { icon: React.FC; colors: string; }> = {
    [StoryTone.ADVENTURE]: { icon: AdventureIcon, colors: 'bg-orange-500 hover:bg-orange-600 border-b-4 border-orange-700' },
    [StoryTone.HEARTWARMING]: { icon: HeartwarmingIcon, colors: 'bg-pink-500 hover:bg-pink-600 border-b-4 border-pink-700' },
    [StoryTone.FUNNY]: { icon: FunnyIcon, colors: 'bg-yellow-400 hover:bg-yellow-500 border-b-4 border-yellow-600' },
    [StoryTone.DREAMY]: { icon: DreamyIcon, colors: 'bg-purple-500 hover:bg-purple-600 border-b-4 border-purple-700' },
    [StoryTone.MYSTERY]: { icon: MysteryIcon, colors: 'bg-blue-500 hover:bg-blue-600 border-b-4 border-blue-700' },
    [StoryTone.RELATIONSHIPS]: { icon: RelationshipsIcon, colors: 'bg-red-500 hover:bg-red-600 border-b-4 border-red-700' },
  };

  const handleToneClick = async (tone: StoryTone) => {
    if (isSpeaking) return;

    setIsSpeaking(true);
    await speak(STORY_TONE_THAI[tone], currentLanguage);

    if (isComponentMounted.current) {
      setSelectedTone(tone);
      setIsSpeaking(false);
    }
  };

  return (
    <div className="w-full h-full grid place-items-center text-center p-4 sm:p-8 overflow-y-auto">
      <div className="w-full max-w-4xl">
        <h2 className="text-4xl font-bold text-purple-700 mb-2">ยอดเยี่ยม!</h2>
        <h3 className="text-2xl font-semibold text-gray-700 mb-8">อยากให้นิทานของคุณเป็นแบบไหน?</h3>
        <div className="flex flex-col md:grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Object.values(StoryTone).map(tone => {
            const Icon = toneDetails[tone].icon;
            const colorClasses = toneDetails[tone].colors;
            const isSelected = selectedTone === tone;
            return (
             <button
                key={tone}
                onClick={() => handleToneClick(tone)}
                disabled={isSpeaking}
                className={`relative flex items-center justify-start gap-4 p-5 rounded-2xl text-white font-bold text-xl text-left transition-all transform hover:scale-105 shadow-lg hover:shadow-2xl focus:outline-none active:border-b-2 active:translate-y-1 ${colorClasses} ${isSelected ? 'ring-4 ring-offset-4 ring-yellow-400 ring-offset-blue-50' : 'focus:ring-4 focus:ring-yellow-400 focus:ring-offset-2'} disabled:opacity-60 disabled:cursor-not-allowed`}
                aria-label={STORY_TONE_THAI[tone]}
              >
                <div className={`flex items-center gap-4`}>
                  <Icon />
                  <span>{STORY_TONE_THAI[tone]}</span>
                </div>
              </button>
            )
          })}
        </div>
        <div className="mt-10">
          <button 
            onClick={() => onSelect(selectedTone)}
            disabled={isSpeaking}
            className="px-10 py-5 bg-green-500 text-white text-3xl font-bold rounded-2xl shadow-2xl hover:bg-green-600 transform hover:scale-105 transition-all duration-300 ease-in-out disabled:opacity-60 disabled:cursor-not-allowed"
          >
            เริ่มนิทาน!
          </button>
        </div>
      </div>
    </div>
  );
};


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.HOME);
  const [collectedWords, setCollectedWords] = useState<Word[]>([]);
  const [language, setLanguage] = useState<Language>(Language.TH);
  const [category, setCategory] = useState<WordCategory>(WordCategory.ANIMALS_NATURE);
  const [storyTone, setStoryTone] = useState<StoryTone>(StoryTone.ADVENTURE);
  const [round, setRound] = useState<number>(1);
  const [preloadedData, setPreloadedData] = useState<PreloadedWord[]>([]);
  const [shuffledFullList, setShuffledFullList] = useState<Word[]>([]);
  
  // Settings State
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isDebugMode, setIsDebugMode] = useState(false);
  const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(true);
  const [isStoryImageGenerationEnabled, setIsStoryImageGenerationEnabled] = useState(true);
  const [aiPersonality, setAiPersonality] = useState<AIPersonality>(AIPersonality.WARM);
  const [showSkipButton, setShowSkipButton] = useState(false);
  
  // Speech Synthesis State
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => { isMounted.current = false; window.speechSynthesis.cancel(); };
  }, []);
  
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadAndSetVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadAndSetVoices();
    window.speechSynthesis.onvoiceschanged = loadAndSetVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  const speak = useCallback((text: string, lang: Language): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || !text?.trim()) {
        resolve();
        return;
      }
      window.speechSynthesis.cancel();
      
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;

      const availableVoices = voices.filter(v => v.lang.startsWith(lang.split('-')[0]));
      if (availableVoices.length > 0) {
        const preferredVoiceKeywords = lang === Language.TH 
            ? ['kanya', 'narisa', 'google']
            : ['google', 'samantha', 'victoria', 'daniel', 'zira', 'david'];
        const getVoiceScore = (voice: SpeechSynthesisVoice) => {
          let score = 0;
          const name = voice.name.toLowerCase();
          if (preferredVoiceKeywords.some(keyword => name.includes(keyword))) score += 2;
          if (voice.localService) score += 1;
          return score;
        };
        availableVoices.sort((a, b) => getVoiceScore(b) - getVoiceScore(a));
        utterance.voice = availableVoices[0];
      }
      utterance.rate = 1.0;
      utterance.pitch = 1.0;

      utterance.onend = () => resolve();
      utterance.onerror = (event) => {
        console.error("SpeechSynthesis Error:", event.error, "for text:", text);
        resolve(); // Resolve even on error to not block the flow
      };

      window.speechSynthesis.speak(utterance);
    });
  }, [voices]);


  const handleStart = useCallback(() => {
    setCollectedWords([]);
    setRound(1);
    setGameState(GameState.MODE_SELECTION);
  }, []);

  const handleGoHome = useCallback(() => {
    setGameState(GameState.HOME);
  }, []);

  const handleModeSelected = useCallback((lang: Language, cat: WordCategory) => {
    setLanguage(lang);
    setCategory(cat);
    setGameState(GameState.PRELOADING_VOCAB);
  }, []);

  const handleSkipToStory = useCallback((lang: Language, cat: WordCategory) => {
    setLanguage(lang);
    const debugWords = VOCABULARY[cat].slice(0, MAX_WORDS_PER_ROUND);
    setCollectedWords(debugWords);
    setGameState(GameState.STORY_TONE_SELECTION);
  }, []);

  const handleVocabPreloadComplete = useCallback((data: { preloadedData: PreloadedWord[]; shuffledFullList: Word[] }) => {
    setPreloadedData(data.preloadedData);
    setShuffledFullList(data.shuffledFullList);
    setGameState(GameState.VOCAB_TRAINER);
  }, []);
  
  const handleVocabComplete = useCallback((words: Word[]) => {
    setCollectedWords(words);
    setGameState(GameState.STORY_TONE_SELECTION);
  }, []);

  const handleToneSelected = useCallback((tone: StoryTone) => {
    setStoryTone(tone);
    setGameState(GameState.STORY);
  }, []);

  const handleStoryComplete = useCallback(() => {
    setGameState(GameState.MODE_SELECTION);
    setCollectedWords([]);
    setRound(prev => prev + 1);
  }, []);
  
  const renderContent = () => {
    switch (gameState) {
      case GameState.HOME:
        return <HomeScreen onStart={handleStart} />;
      case GameState.MODE_SELECTION:
        return <ModeSelectionScreen onStart={handleModeSelected} onSkip={handleSkipToStory} showSkipButton={isDebugMode && showSkipButton} speak={speak} />;
      case GameState.PRELOADING_VOCAB:
        return <VocabPreloader category={category} onComplete={handleVocabPreloadComplete} isImageGenerationEnabled={isImageGenerationEnabled} />;
      case GameState.VOCAB_TRAINER:
        return <VocabTrainer 
                  onComplete={handleVocabComplete} 
                  round={round} 
                  language={language} 
                  initialData={preloadedData}
                  fullWordList={shuffledFullList}
                  isImageGenerationEnabled={isImageGenerationEnabled}
                />;
      case GameState.STORY_TONE_SELECTION:
        return <StoryToneSelectionScreen onSelect={handleToneSelected} speak={speak} currentLanguage={language} />;
      case GameState.STORY:
        return <Storybook 
                  words={collectedWords} 
                  onComplete={handleStoryComplete} 
                  language={language} 
                  storyTone={storyTone}
                  isImageGenerationEnabled={isStoryImageGenerationEnabled}
                  aiPersonality={aiPersonality}
                />;
      default:
        return <HomeScreen onStart={handleStart} />;
    }
  };

  return (
    <div className="min-h-screen w-full font-sans text-gray-800 bg-gradient-to-br from-blue-100 via-purple-100 to-yellow-100 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[90vh] max-h-[800px] bg-white/70 backdrop-blur-xl rounded-3xl shadow-2xl overflow-hidden relative">
        {gameState !== GameState.HOME && (
          <div className="absolute top-4 right-4 z-50 flex items-center gap-2">
             <button
              onClick={handleGoHome}
              className="flex items-center justify-center h-12 w-12 bg-white/70 hover:bg-white/90 backdrop-blur-sm rounded-full shadow-md transition-all"
              aria-label="กลับไปหน้าจอหลัก"
              title="กลับไปหน้าจอหลัก"
            >
              <HomeIcon />
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center h-12 w-12 bg-white/70 hover:bg-white/90 backdrop-blur-sm rounded-full shadow-md transition-all"
              aria-label="ตั้งค่า"
              title="ตั้งค่า"
            >
              <SettingsIcon />
            </button>
          </div>
        )}
        {renderContent()}
        <SettingsModal 
            isOpen={isSettingsOpen}
            onClose={() => setIsSettingsOpen(false)}
            isDebugMode={isDebugMode}
            setIsDebugMode={setIsDebugMode}
            isImageGenerationEnabled={isImageGenerationEnabled}
            setIsImageGenerationEnabled={setIsImageGenerationEnabled}
            isStoryImageGenerationEnabled={isStoryImageGenerationEnabled}
            setIsStoryImageGenerationEnabled={setIsStoryImageGenerationEnabled}
            aiPersonality={aiPersonality}
            setAiPersonality={setAiPersonality}
            showSkipButton={showSkipButton}
            setShowSkipButton={setShowSkipButton}
        />
      </div>
    </div>
  );
};

export default App;
