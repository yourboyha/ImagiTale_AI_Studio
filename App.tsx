import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Language, WordCategory, Word, PreloadedWord, StoryTone } from './types';
import { VOCABULARY, WORD_CATEGORY_THAI, STORY_TONE_THAI, MAX_WORDS_PER_ROUND } from './constants';
import { generateVocabularyList, generateVocabImage } from './services/geminiService';

// Import components
import HomeScreen from './components/HomeScreen';
import VocabTrainer from './components/VocabTrainer';
import Storybook from './components/Storybook';
import SettingsModal from './components/SettingsModal';
import SettingsIcon from './components/icons/SettingsIcon';
import HomeIcon from './components/icons/HomeIcon';

// Tone Icons
import AdventureIcon from './components/icons/AdventureIcon';
import DreamyIcon from './components/icons/DreamyIcon';
import FunnyIcon from './components/icons/FunnyIcon';
import HeartwarmingIcon from './components/icons/HeartwarmingIcon';
import MysteryIcon from './components/icons/MysteryIcon';
import RelationshipsIcon from './components/icons/RelationshipsIcon';


// Inlined component for Mode Selection
const ModeSelectionScreen: React.FC<{ onSelect: (lang: Language, category: WordCategory) => void }> = ({ onSelect }) => {
    const [selectedLanguage, setSelectedLanguage] = useState<Language>(Language.TH);

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-purple-100 to-blue-200">
            <div className="w-full max-w-4xl mx-auto">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-purple-800 text-center mb-2 font-['Lilita_One']">เลือกหมวดหมู่คำศัพท์</h1>
                <p className="text-center text-gray-600 mb-6 sm:mb-8 text-lg">เลือกภาษาและหมวดหมู่ที่น้องๆ สนใจได้เลย!</p>

                {/* Language Selector */}
                <div className="flex justify-center mb-8">
                    <div className="flex p-1 bg-purple-200 rounded-full">
                        <button
                            onClick={() => setSelectedLanguage(Language.TH)}
                            className={`px-6 py-2 rounded-full text-lg font-bold transition-colors ${selectedLanguage === Language.TH ? 'bg-purple-600 text-white shadow' : 'text-purple-700'}`}
                        >
                            🇹🇭 ภาษาไทย
                        </button>
                        <button
                            onClick={() => setSelectedLanguage(Language.EN)}
                            className={`px-6 py-2 rounded-full text-lg font-bold transition-colors ${selectedLanguage === Language.EN ? 'bg-purple-600 text-white shadow' : 'text-purple-700'}`}
                        >
                            🇺🇸 English
                        </button>
                    </div>
                </div>

                {/* Category Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {Object.values(WordCategory).map((category) => (
                        <button
                            key={category}
                            onClick={() => onSelect(selectedLanguage, category)}
                            className="p-4 sm:p-6 bg-white rounded-2xl shadow-lg text-purple-700 text-center transform hover:-translate-y-2 transition-transform duration-300 ease-out group"
                        >
                            <div className="text-4xl sm:text-5xl mb-2 group-hover:animate-bounce">
                                { {
                                    [WordCategory.ANIMALS_NATURE]: '🐶',
                                    [WordCategory.FAMILY_PEOPLE]: '👨‍👩‍👧‍👦',
                                    [WordCategory.FOOD_DRINK]: '🍎',
                                    [WordCategory.THINGS_TOYS]: '🧸',
                                    [WordCategory.PLACES_ENVIRONMENT]: '🏞️',
                                    [WordCategory.ACTIONS_EMOTIONS]: '🏃‍♀️',
                                }[category] }
                            </div>
                            <h3 className="text-base sm:text-lg font-bold">{WORD_CATEGORY_THAI[category]}</h3>
                            <p className="text-sm text-gray-500">{category}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

// Inlined component for Preloading
const PreloadingScreen: React.FC<{ category: WordCategory | null }> = ({ category }) => (
    <div className="w-full h-full flex flex-col items-center justify-center bg-purple-900 text-white p-8 text-center">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-yellow-300 mb-8"></div>
        <h2 className="text-3xl font-bold">กำลังเตรียมคำศัพท์...</h2>
        {category && <p className="mt-2 text-lg">AI กำลังหาคำศัพท์ในหมวด "{WORD_CATEGORY_THAI[category]}" ให้นะคะ!</p>}
    </div>
);

// Inlined component for Story Tone Selection
const StoryToneSelectionScreen: React.FC<{ onSelect: (tone: StoryTone) => void }> = ({ onSelect }) => {
    const toneIcons: Record<StoryTone, React.ReactNode> = {
        [StoryTone.ADVENTURE]: <AdventureIcon />,
        [StoryTone.HEARTWARMING]: <HeartwarmingIcon />,
        [StoryTone.FUNNY]: <FunnyIcon />,
        [StoryTone.DREAMY]: <DreamyIcon />,
        [StoryTone.MYSTERY]: <MysteryIcon />,
        [StoryTone.RELATIONSHIPS]: <RelationshipsIcon />,
    };

    return (
        <div className="w-full h-full flex flex-col items-center justify-center p-4 sm:p-8 bg-gradient-to-br from-yellow-100 to-pink-200">
            <div className="w-full max-w-4xl mx-auto">
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-pink-800 text-center mb-2 font-['Lilita_One']">เลือกบรรยากาศนิทาน</h1>
                <p className="text-center text-gray-600 mb-6 sm:mb-8 text-lg">อยากให้นิทานของเราเป็นแบบไหนดีนะ?</p>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
                    {Object.values(StoryTone).map((tone) => (
                        <button
                            key={tone}
                            onClick={() => onSelect(tone)}
                            className="p-4 sm:p-6 bg-white rounded-2xl shadow-lg text-pink-700 text-center transform hover:-translate-y-2 transition-transform duration-300 ease-out group"
                        >
                            <div className="flex justify-center items-center text-pink-500 mb-2 h-12 w-12 mx-auto group-hover:scale-125 transition-transform">
                               {toneIcons[tone]}
                            </div>
                            <h3 className="text-base sm:text-lg font-bold">{STORY_TONE_THAI[tone]}</h3>
                             <p className="text-sm text-gray-500">{tone}</p>
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};

const App: React.FC = () => {
    // State management
    const [gameState, setGameState] = useState<GameState>(GameState.HOME);
    const [language, setLanguage] = useState<Language>(Language.TH);
    const [wordCategory, setWordCategory] = useState<WordCategory | null>(null);
    const [storyTone, setStoryTone] = useState<StoryTone | null>(null);
    const [trainedWords, setTrainedWords] = useState<Word[]>([]);
    const [preloadedData, setPreloadedData] = useState<PreloadedWord[]>([]);
    const [fullWordList, setFullWordList] = useState<Word[]>([]);
    const [round, setRound] = useState(1);

    // Debug / Settings state
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isDebugMode, setIsDebugMode] = useState(false);
    const [isImageGenerationEnabled, setIsImageGenerationEnabled] = useState(true);
    const [isStoryImageGenerationEnabled, setIsStoryImageGenerationEnabled] = useState(true);
    const [showSkipButton, setShowSkipButton] = useState(false);

    // Audio state and refs
    const [isSpeaking, setIsSpeaking] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const currentAudioSrc = useRef<string | null>(null);
    const isMounted = useRef(true);

    useEffect(() => {
        isMounted.current = true;
        return () => {
          isMounted.current = false;
        }
    }, [])

    // Audio generation and playback
    const speak = useCallback(async (text: string) => {
        if (!text || !isMounted.current) return;
        setIsSpeaking(true);

        try {
            const response = await fetch('/.netlify/functions/generate-speech', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ task: 'generate-speech', payload: { textToSpeak: text, language } }),
            });
            if (!response.ok) throw new Error('Failed to generate speech');
            const { audioContent, mimeType } = await response.json();
            
            if (!isMounted.current) return;
            
            const audioSrc = `data:${mimeType};base64,${audioContent}`;
            currentAudioSrc.current = audioSrc;

            if (audioRef.current) {
                audioRef.current.src = audioSrc;
                audioRef.current.play().catch(e => console.error("Audio play failed:", e));
            }

        } catch (error) {
            console.error("Error in speech synthesis:", error);
            if (isMounted.current) setIsSpeaking(false);
        }
    }, [language]);

    const stopSpeech = useCallback(() => {
        if (audioRef.current && !audioRef.current.paused) {
            audioRef.current.pause();
            audioRef.current.currentTime = 0;
            currentAudioSrc.current = null;
        }
        if (isMounted.current) setIsSpeaking(false);
    }, []);

    // Effect for handling audio element events
    useEffect(() => {
        const audio = new Audio();
        audioRef.current = audio;
        
        const onEnded = () => { if(isMounted.current) setIsSpeaking(false); };
        
        audio.addEventListener('ended', onEnded);

        return () => {
            audio.removeEventListener('ended', onEnded);
            if (audio) {
                audio.pause();
                audio.src = '';
            }
        };
    }, []);

    // Game flow logic
    const handleStart = () => setGameState(GameState.MODE_SELECTION);

    const handleModeSelect = (lang: Language, category: WordCategory) => {
        setLanguage(lang);
        setWordCategory(category);
        setGameState(GameState.PRELOADING_VOCAB);
    };

    const handleVocabComplete = (words: Word[]) => {
        setTrainedWords(words);
        setGameState(GameState.STORY_TONE_SELECTION);
    };

    const handleToneSelect = (tone: StoryTone) => {
        setStoryTone(tone);
        setGameState(GameState.STORY);
    };

    const handleStoryComplete = () => {
        setRound(prev => prev + 1);
        setTrainedWords([]);
        setStoryTone(null);
        setGameState(GameState.MODE_SELECTION);
    };

    const handleGoHome = () => {
        stopSpeech();
        setGameState(GameState.HOME);
        setRound(1);
        setTrainedWords([]);
        setStoryTone(null);
        setWordCategory(null);
    };
    
    // Preloading logic
    useEffect(() => {
        if (gameState !== GameState.PRELOADING_VOCAB || !wordCategory) return;

        const preload = async () => {
            let words: Word[];
            if (isDebugMode) {
                words = VOCABULARY[wordCategory] || [];
            } else {
                try {
                    words = await generateVocabularyList(wordCategory);
                } catch (e) {
                    console.error("Failed to generate vocab, using fallback", e);
                    words = VOCABULARY[wordCategory] || [];
                }
            }
            if (!isMounted.current) return;
            setFullWordList(words);

            if (words.length < MAX_WORDS_PER_ROUND) {
                console.error("Not enough words fetched for the round.");
                handleGoHome();
                return;
            }

            const initialWords = words.slice(0, MAX_WORDS_PER_ROUND);

            const preloadedPromises = initialWords.map(async (word) => {
                 let imageUrl: string;
                 if (isImageGenerationEnabled) {
                    try {
                        imageUrl = await generateVocabImage(word.english);
                    } catch (e) {
                         console.error(`Failed to generate image for ${word.english}, using fallback`, e);
                         imageUrl = `https://loremflickr.com/400/300/${word.english},illustration,simple?lock=${word.english.replace(/\s/g, '')}`;
                    }
                 } else {
                    imageUrl = `https://loremflickr.com/400/300/${word.english},illustration,simple?lock=${word.english.replace(/\s/g, '')}`;
                 }
                return { word, imageUrl };
            });

            const loadedData = await Promise.all(preloadedPromises);
            if (isMounted.current) {
                setPreloadedData(loadedData);
                setGameState(GameState.VOCAB_TRAINER);
            }
        };

        preload();

    }, [gameState, wordCategory, isDebugMode, isImageGenerationEnabled, handleGoHome]);

    // Component rendering logic
    const renderGameState = () => {
        switch (gameState) {
            case GameState.HOME:
                return <HomeScreen onStart={handleStart} />;
            case GameState.MODE_SELECTION:
                return <ModeSelectionScreen onSelect={handleModeSelect} />;
            case GameState.PRELOADING_VOCAB:
                return <PreloadingScreen category={wordCategory} />;
            case GameState.VOCAB_TRAINER:
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
            case GameState.STORY_TONE_SELECTION:
                return <StoryToneSelectionScreen onSelect={handleToneSelect} />;
            case GameState.STORY:
                if (!storyTone) {
                    handleGoHome();
                    return null;
                }
                return <Storybook
                    words={trainedWords}
                    onComplete={handleStoryComplete}
                    language={language}
                    storyTone={storyTone}
                    isImageGenerationEnabled={isStoryImageGenerationEnabled}
                    speak={speak}
                    stopSpeech={stopSpeech}
                    isSpeaking={isSpeaking}
                />;
            default:
                return <HomeScreen onStart={handleStart} />;
        }
    };

    return (
        <div className="w-screen h-screen bg-gray-100 font-sans relative overflow-hidden">
            <main className="w-full h-full">
                {renderGameState()}
            </main>
            
            <button
                onClick={() => setIsSettingsOpen(true)}
                className="absolute top-4 right-4 z-30 p-2 bg-white/50 rounded-full text-purple-700 hover:bg-white/90 transition-colors shadow-lg"
                aria-label="Settings"
            >
                <SettingsIcon />
            </button>

            {gameState !== GameState.HOME && (
                 <button
                    onClick={handleGoHome}
                    className="absolute top-4 left-4 z-30 p-2 bg-white/50 rounded-full text-purple-700 hover:bg-white/90 transition-colors shadow-lg"
                    aria-label="Go Home"
                >
                    <HomeIcon />
                </button>
            )}

            {showSkipButton && gameState === GameState.VOCAB_TRAINER && (
                <button
                    onClick={() => handleVocabComplete(fullWordList.slice(0, MAX_WORDS_PER_ROUND))}
                    className="absolute bottom-4 right-4 z-30 px-4 py-2 bg-yellow-400 text-black font-bold rounded-lg shadow-md"
                >
                    Skip to Story
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
};

export default App;
