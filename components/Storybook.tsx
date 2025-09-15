import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Word, StoryScene, Language, StoryTone, AIPersonality } from '../types';
import { generateInitialStoryScene, generateNextStoryScene, generateFinalStoryScene } from '../services/geminiService';
import { STORY_FOLLOW_UP_QUESTIONS_TH, STORY_FOLLOW_UP_QUESTIONS_EN } from '../constants';
import MicrophoneIcon from './icons/MicrophoneIcon';
import StopIcon from './icons/StopIcon';
import SpeakerIcon from './icons/SpeakerIcon';
import SpeakerOffIcon from './icons/SpeakerOffIcon';

// @ts-ignore
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

interface StorybookProps {
  words: Word[];
  onComplete: () => void;
  language: Language;
  storyTone: StoryTone;
  isImageGenerationEnabled: boolean;
  aiPersonality: AIPersonality;
}

const Storybook: React.FC<StorybookProps> = ({ words, onComplete, language, storyTone, isImageGenerationEnabled, aiPersonality }) => {
  const [scenes, setScenes] = useState<StoryScene[]>([]);
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isAwaitingFeedback, setIsAwaitingFeedback] = useState(false);
  const [displayedText, setDisplayedText] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const recognitionRef = useRef(SpeechRecognition ? new SpeechRecognition() : null);
  const storySoFar = scenes.map(s => s.text).join(' ');
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessing = useRef(false);
  const hasSpokenForScene = useRef<Record<number, boolean>>({});
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      window.speechSynthesis.cancel();
    };
  }, []);
  
  useEffect(() => {
    if (!('speechSynthesis' in window)) return;
    const loadAndSetVoices = () => setVoices(window.speechSynthesis.getVoices());
    loadAndSetVoices();
    window.speechSynthesis.onvoiceschanged = loadAndSetVoices;
    return () => { window.speechSynthesis.onvoiceschanged = null; };
  }, []);

  useEffect(() => {
    const recognition = recognitionRef.current;
    if (recognition) recognition.lang = language;
  }, [language]);
  
  const cleanupListeners = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    }
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
  }, []);

  const speak = useCallback((text: string, lang: Language): Promise<void> => {
    return new Promise((resolve) => {
      if (!('speechSynthesis' in window) || !text?.trim()) {
        return resolve();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang;

      const availableVoices = voices.filter(v => v.lang.startsWith(lang.split('-')[0]));
      let bestVoice: SpeechSynthesisVoice | null = null;

      if (availableVoices.length > 0) {
        const preferredVoiceKeywords = lang === Language.TH 
            ? ['kanya', 'narisa', 'google']
            : ['google', 'samantha', 'victoria', 'daniel', 'zira', 'david'];

        const getVoiceScore = (voice: SpeechSynthesisVoice): number => {
            let score = 0;
            const name = voice.name.toLowerCase();
            if (preferredVoiceKeywords.some(keyword => name.includes(keyword))) score += 2;
            if (voice.localService) score += 1;
            return score;
        };

        availableVoices.sort((a, b) => getVoiceScore(b) - getVoiceScore(a));
        bestVoice = availableVoices[0];
      }
      
      if (bestVoice) {
        utterance.voice = bestVoice;
      }
      
      utterance.rate = 0.9; // A more deliberate, storyteller pace
      utterance.pitch = 1.1; // Slightly higher, friendly but not unnatural

      let hasStarted = false;
      const failsafeTimer = setTimeout(() => {
        if (!hasStarted) {
          console.warn('SpeechSynthesis did not start within 3 seconds.');
          utterance.onend = null; utterance.onerror = null;
          resolve();
        }
      }, 3000);

      const onDone = () => {
        clearTimeout(failsafeTimer);
        if (isMounted.current) {
          setTimeout(() => {
            if (!window.speechSynthesis.speaking && isMounted.current) {
              setIsSpeaking(false);
            }
          }, 50);
        }
        resolve();
      };
      
      utterance.onstart = () => {
        hasStarted = true;
        if (isMounted.current) setIsSpeaking(true);
      };

      utterance.onend = onDone;

      utterance.onerror = (event) => {
        console.error('SpeechSynthesis Error:', event.error, 'for text:', text);
        onDone();
      };
      
      window.speechSynthesis.speak(utterance);
    });
  }, [voices]);

  const generateScene = useCallback(async (choice: string | null = null) => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsLoading(true);
    setIsAwaitingFeedback(false);
    let newScene: StoryScene;
    const wordStrings = words.map(w => w.english);
    
    if (scenes.length === 0) {
      newScene = await generateInitialStoryScene(wordStrings, language, storyTone, isImageGenerationEnabled, aiPersonality);
    } else if (scenes.length < 4) {
      newScene = await generateNextStoryScene(storySoFar, choice || '', language, storyTone, wordStrings, isImageGenerationEnabled, scenes.length, aiPersonality);
    } else {
      newScene = await generateFinalStoryScene(storySoFar, language, storyTone, wordStrings, isImageGenerationEnabled, aiPersonality);
    }

    setScenes(prev => [...prev, newScene]);
    if(scenes.length > 0) setCurrentSceneIndex(prev => prev + 1);
    setIsLoading(false);
  }, [words, scenes, storySoFar, language, storyTone, isImageGenerationEnabled, aiPersonality]);
  
  useEffect(() => {
    if (scenes.length === 0) generateScene();
    return cleanupListeners;
  }, []);
  
  const currentScene = scenes[currentSceneIndex];

  const processSpeech = useCallback((finalTranscript: string) => {
    if (!finalTranscript) return;
    setIsAwaitingFeedback(true);
    feedbackTimeout.current = setTimeout(() => generateScene(finalTranscript), 1000);
  }, [generateScene]);

  const processSpeechRef = useRef(processSpeech);
  useEffect(() => { processSpeechRef.current = processSpeech; }, [processSpeech]);

  useEffect(() => {
    if (currentScene && !isLoading) {
      setDisplayedText('');
      const textToDisplay = currentScene.text || '';
      if (!textToDisplay) return;

      if (!hasSpokenForScene.current[currentSceneIndex]) {
        hasSpokenForScene.current[currentSceneIndex] = true;

        const playNarrationSequence = () => {
          if (!isMounted.current) return;

          const createUtterance = (text: string): SpeechSynthesisUtterance | null => {
            if (!('speechSynthesis' in window) || !text?.trim()) return null;
            const utterance = new SpeechSynthesisUtterance(text);
            utterance.lang = language;
            const availableVoices = voices.filter(v => v.lang.startsWith(language.split('-')[0]));
            if (availableVoices.length > 0) {
              const preferredVoiceKeywords = language === Language.TH
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
            utterance.rate = 0.9;
            utterance.pitch = 1.1;
            return utterance;
          };

          const sceneUtterance = createUtterance(textToDisplay);
          if (!sceneUtterance) return;
          
          const questionText = currentScene.choices?.length
            ? (() => {
                const questions = language === Language.TH ? STORY_FOLLOW_UP_QUESTIONS_TH : STORY_FOLLOW_UP_QUESTIONS_EN;
                return questions[Math.floor(Math.random() * questions.length)];
              })()
            : null;

          const questionUtterance = questionText ? createUtterance(questionText) : null;
          
          sceneUtterance.onstart = () => { if (isMounted.current) setIsSpeaking(true); };
          sceneUtterance.onerror = (e) => console.error('SpeechSynthesis Error (scene):', e.error);
          
          const finalUtterance = questionUtterance || sceneUtterance;
          finalUtterance.onend = () => { if (isMounted.current) setIsSpeaking(false); };
          finalUtterance.onerror = (e) => {
            console.error('SpeechSynthesis Error (final utterance):', e.error);
            if (isMounted.current) setIsSpeaking(false);
          };

          setTimeout(() => {
            if (isMounted.current) {
              window.speechSynthesis.cancel();
              window.speechSynthesis.speak(sceneUtterance);
              if (questionUtterance) {
                window.speechSynthesis.speak(questionUtterance);
              }
            }
          }, 100);
        };

        playNarrationSequence();
      }

      let i = 0;
      const textSpeed = 90;
      const intervalId = setInterval(() => {
        if (i < textToDisplay.length) {
          setDisplayedText(textToDisplay.substring(0, i + 1));
          i++;
        } else {
          clearInterval(intervalId);
        }
      }, textSpeed);

      return () => clearInterval(intervalId);
    }
  }, [currentScene, isLoading, currentSceneIndex, language, voices]);

  const handleSpeakChoice = (choiceText: string) => {
    window.speechSynthesis.cancel();
    speak(choiceText, language);
  };

  const handleReplayOrStopAudio = useCallback(() => {
    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else if (currentScene?.text && displayedText.length >= currentScene.text.length) {
      window.speechSynthesis.cancel();
      speak(currentScene.text, language);
    }
  }, [isSpeaking, currentScene, displayedText, language, speak]);
  
  const stopListening = useCallback(() => {
    const recognition = recognitionRef.current;
    if (recognition && isListening) recognition.stop();
  }, [isListening]);
  
  const startListening = () => {
    const recognition = recognitionRef.current;
    if (!recognition || isListening || isAwaitingFeedback || isLoading) return;
    
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    cleanupListeners();
    isProcessing.current = false;
    setTranscript('');
    setIsListening(true);
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.start();

    recognition.onresult = (event: any) => {
      let final = ''; let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) final += event.results[i][0].transcript;
        else interim += event.results[i][0].transcript;
      }
      setTranscript(final || interim);
      
      if (final && !isProcessing.current) {
        isProcessing.current = true;
        recognition.stop();
        processSpeechRef.current(final);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Storybook speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      if (!isProcessing.current) {
          isProcessing.current = true;
          setTranscript(prev => {
              if (prev) processSpeechRef.current(prev);
              return prev;
          });
      }
    };
  };

  if (isLoading && scenes.length === 0) {
    return (
      <div className="w-full h-full flex flex-col items-center justify-center bg-purple-900 text-white p-8">
        <div className="animate-spin rounded-full h-32 w-32 border-t-2 border-b-2 border-yellow-300"></div>
        <h2 className="text-3xl font-bold mt-8">นิทานของเรากำลังจะเริ่มขึ้น...</h2>
        <p className="mt-2 text-lg">AI กำลังสร้างสรรค์การผจญภัยสำหรับคุณ!</p>
      </div>
    );
  }
  
  const areButtonsDisabled = isLoading || isAwaitingFeedback;

  return (
    <div className="w-full h-full flex flex-col bg-gray-100 overflow-y-auto">
      <div className="w-full p-4 bg-white/80 backdrop-blur-sm shadow-md z-10 sticky top-0">
        <p className="text-center text-sm font-semibold text-gray-600 mb-1">ฉากที่ {currentSceneIndex + 1} / 5</p>
        <div className="w-full bg-gray-200 rounded-full h-4">
          <div 
            className="bg-gradient-to-r from-yellow-400 to-orange-500 h-4 rounded-full transition-all duration-700 ease-out" 
            style={{ width: `${((currentSceneIndex + 1) / 5) * 100}%` }}
          ></div>
        </div>
      </div>
      
      <main className="flex-1 flex flex-col p-4 gap-4">
        <div className="w-full aspect-video bg-black rounded-lg overflow-hidden shadow-lg flex items-center justify-center">
          {isLoading && !currentScene?.imageUrl ? (
             <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500"></div>
          ) : (
            <img src={currentScene.imageUrl} alt="Story scene" className="w-full h-full object-cover"/>
          )}
        </div>
        
        <div className="w-full p-4 sm:p-6 flex flex-col gap-4 bg-white rounded-lg shadow-lg">
          <div className="min-h-[6rem] relative">
            {currentScene ? (
              <>
                <p className="text-lg md:text-xl text-gray-800 leading-relaxed pr-10">
                  {displayedText}
                  {displayedText.length < (currentScene.text?.length ?? 0) && (
                      <span className="inline-block w-1 h-6 bg-gray-700 ml-1 animate-pulse align-bottom"></span>
                  )}
                </p>
                 <button
                    onClick={handleReplayOrStopAudio}
                    disabled={isLoading || !currentScene?.text}
                    className="absolute top-0 right-0 p-1 text-gray-500 hover:text-purple-600 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                    aria-label={isSpeaking ? "หยุดเสียง" : "เล่นเสียงซ้ำ"}
                    title={isSpeaking ? "หยุดเสียง" : "เล่นเสียงซ้ำ"}
                  >
                   {isSpeaking ? <SpeakerOffIcon /> : <SpeakerIcon />}
                  </button>
              </>
            ) : <p>กำลังโหลดเนื้อเรื่อง...</p> }
          </div>
          
          <div>
              {isLoading || isAwaitingFeedback ? (
                  <div className="flex items-center justify-center space-x-2 h-28">
                      <div className="w-4 h-4 rounded-full bg-purple-700 animate-pulse"></div>
                      <div className="w-4 h-4 rounded-full bg-purple-700 animate-pulse [animation-delay:0.2s]"></div>
                      <div className="w-4 h-4 rounded-full bg-purple-700 animate-pulse [animation-delay:0.4s]"></div>
                      <p className="text-purple-700 ml-2">{isAwaitingFeedback ? 'กำลังประมวลผล...' : 'AI กำลังคิด...'}</p>
                  </div>
              ) : (
                <div className="flex flex-col items-center gap-3">
                  {currentScene?.choices && (
                    <div className="w-full flex flex-col items-center gap-3">
                      {currentScene.choices.map((choice, index) => (
                        <button
                          key={index}
                          onClick={() => handleSpeakChoice(choice)}
                          disabled={areButtonsDisabled || isListening || isSpeaking}
                          className="w-full px-4 py-3 text-white font-bold text-base rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out bg-gradient-to-br from-purple-500 to-indigo-600 hover:from-purple-600 hover:to-indigo-700 border-b-4 border-purple-700 active:border-b-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {choice}
                        </button>
                      ))}
                    </div>
                  )}

                  {currentScene?.choices && recognitionRef.current && (
                      <div className="w-full flex flex-col items-center gap-1 mt-3">
                          <button onClick={isListening ? stopListening : startListening} disabled={areButtonsDisabled || isSpeaking} className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-300 ${isListening ? 'bg-red-500 animate-pulse scale-110' : 'bg-blue-500 hover:bg-blue-600'} text-white shadow-lg disabled:bg-gray-400`}>
                              <div className="w-8 h-8">
                                {isListening ? <StopIcon /> : <MicrophoneIcon />}
                              </div>
                          </button>
                           <p className="text-lg font-semibold text-blue-600 min-h-[3rem] h-auto text-center px-2 flex items-center justify-center break-words">
                              {transcript || (language === Language.TH ? 'หรือบอกไอเดียของน้องๆ มาได้เลย!' : 'Or, tell me your own idea!')}
                           </p>
                      </div>
                  )}
                  
                  {scenes.length >= 5 && !currentScene?.choices && (
                    <button onClick={onComplete} disabled={areButtonsDisabled || isListening} className="w-full mt-2 px-8 py-4 text-white font-bold text-xl rounded-xl shadow-lg transform hover:scale-105 transition-all duration-300 ease-in-out bg-gradient-to-br from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 border-b-4 border-green-700 active:border-b-2 disabled:opacity-50">
                      จบแล้ว! เล่นอีกครั้งไหม?
                    </button>
                  )}
                </div>
              )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default Storybook;