import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Word, Language, PreloadedWord } from '../types';
import { MAX_WORDS_PER_ROUND } from '../constants';
import { generateVocabImage } from '../services/geminiService';
import SparkleIcon from './icons/SparkleIcon';
import BadgeIcon from './icons/BadgeIcon';

// @ts-ignore
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = SpeechRecognition ? new SpeechRecognition() : null;

interface VocabTrainerProps {
  onComplete: (words: Word[]) => void;
  round: number;
  language: Language;
  initialData: PreloadedWord[];
  fullWordList: Word[];
  isImageGenerationEnabled: boolean;
}

const VocabTrainer: React.FC<VocabTrainerProps> = ({ onComplete, round, language, initialData, fullWordList, isImageGenerationEnabled }) => {
  const [wordData, setWordData] = useState<PreloadedWord[]>([]);
  const [nextAvailableWordIndex, setNextAvailableWordIndex] = useState(MAX_WORDS_PER_ROUND);
  const [currentWordIndex, setCurrentWordIndex] = useState(0);
  const [collectedWords, setCollectedWords] = useState<Word[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [feedbackText, setFeedbackText] = useState('เตรียมตัวให้พร้อม!');
  const [transcript, setTranscript] = useState('');
  const [countdown, setCountdown] = useState(10);
  const [isImageLoading, setIsImageLoading] = useState(true); // Start as true
  const [isAwaitingFeedback, setIsAwaitingFeedback] = useState(false);
  const [incorrectAttempts, setIncorrectAttempts] = useState(0);
  
  const countdownInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const feedbackTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isProcessing = useRef(false);

  const currentWordDataItem = wordData[currentWordIndex];
  const currentWord = currentWordDataItem?.word;

  useEffect(() => {
    if (recognition) {
        recognition.continuous = true;
        recognition.lang = language;
        recognition.interimResults = true;
    }
    setWordData(initialData);
    setNextAvailableWordIndex(MAX_WORDS_PER_ROUND);
    setCurrentWordIndex(0);
    setCollectedWords([]);
    setFeedbackText('เตรียมตัวให้พร้อม!');
    setTranscript('');
    setIncorrectAttempts(0);
    setIsImageLoading(initialData.length === 0);
  }, [initialData, language]);
  
  // Effect to manage image loading state based on word data
  useEffect(() => {
    if (currentWordDataItem?.imageUrl) {
      setIsImageLoading(false);
    }
  }, [currentWordDataItem]);


  const speakFeedback = (text: string, lang: Language) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
  };
  
  const cleanupListeners = useCallback(() => {
    if (recognition) {
      recognition.onresult = null;
      recognition.onerror = null;
      recognition.onend = null;
    }
    if (countdownInterval.current) clearInterval(countdownInterval.current);
    if (feedbackTimeout.current) clearTimeout(feedbackTimeout.current);
  }, []);

  useEffect(() => {
    return cleanupListeners;
  }, [cleanupListeners]);

  const handleCorrectAnswer = useCallback(() => {
      if (!currentWord) return;
      const feedback = language === Language.EN ? 'Great job!' : 'เก่งมาก!';
      setFeedbackText(feedback);
      speakFeedback(feedback, language);
      const newCollected = [...collectedWords, currentWord];
      setCollectedWords(newCollected);

      feedbackTimeout.current = setTimeout(() => {
        if (newCollected.length === MAX_WORDS_PER_ROUND) {
          onComplete(newCollected);
        } else {
          setCurrentWordIndex(prev => prev + 1);
          setIncorrectAttempts(0); // Reset for next word
          setFeedbackText(language === Language.EN ? 'Next word!' : 'คำต่อไป!');
          setTranscript('');
          setIsImageLoading(true); // Set loading for next image
        }
        setIsAwaitingFeedback(false);
      }, 1000);
  }, [collectedWords, currentWord, onComplete, language]);

  const handleIncorrectAnswer = useCallback(() => {
      setIncorrectAttempts(prev => prev + 1);
      const feedback = language === Language.EN ? 'Try again!' : 'ลองอีกครั้งนะ!';
      setFeedbackText(feedback);
      speakFeedback(feedback, language);
      feedbackTimeout.current = setTimeout(() => {
        setFeedbackText(language === Language.EN ? 'Lets try that word again' : 'ลองพูดอีกครั้งนะ');
        setTranscript('');
        setIsAwaitingFeedback(false);
      }, 1000);
  }, [language]);

  const processSpeech = useCallback((finalTranscript: string) => {
    if (!currentWord) return;
    const spoken = finalTranscript.toLowerCase().trim();
    
    // Check against both Thai and English versions for flexibility with loanwords
    const targetEnglish = currentWord.english.toLowerCase().trim();
    const targetThai = currentWord.thai.toLowerCase().trim();

    if (spoken.includes(targetThai) || spoken.includes(targetEnglish)) {
      handleCorrectAnswer();
    } else {
      handleIncorrectAnswer();
    }
  }, [currentWord, handleCorrectAnswer, handleIncorrectAnswer]);

  const startListening = () => {
    if (!recognition || isListening || isAwaitingFeedback || isImageLoading) return;
    
    cleanupListeners();
    isProcessing.current = false;
    setTranscript('');
    setIsListening(true);
    setCountdown(10);
    recognition.lang = language; // Ensure lang is set before starting
    recognition.start();

    countdownInterval.current = setInterval(() => {
        setCountdown(prev => prev - 1);
    }, 1000);

    recognition.onresult = (event: any) => {
      let final = '';
      let interim = '';
      for (let i = 0; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          final += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }
      setTranscript(final || interim);
      
      if (final && !isProcessing.current) {
        isProcessing.current = true;
        recognition.stop();
        setIsAwaitingFeedback(true);
        feedbackTimeout.current = setTimeout(() => processSpeech(final), 1000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
      if (event.error === 'no-speech') {
        setFeedbackText('ไม่ได้ยินเสียง ลองพูดอีกครั้งนะคะ');
      } else {
        setFeedbackText('เกิดข้อผิดพลาดในการฟังเสียง');
      }
    };

    recognition.onend = () => {
      setIsListening(false);
      if (countdownInterval.current) clearInterval(countdownInterval.current);
      if (!isProcessing.current) {
          isProcessing.current = true;
          setTranscript(prev => {
              if (prev) { // Only process if there is a transcript
                setIsAwaitingFeedback(true);
                feedbackTimeout.current = setTimeout(() => processSpeech(prev), 1000);
              } else {
                handleIncorrectAnswer(); // If nothing was said
              }
              return prev;
          });
      }
    };
  };

  useEffect(() => {
    if (countdown === 0 && isListening) {
      recognition?.stop();
    }
  }, [countdown, isListening, handleIncorrectAnswer]);
  
  const handleListenSound = () => {
    if (!currentWord) return;
    const wordToSpeak = language === Language.EN ? currentWord.english : currentWord.thai;
    const utterance = new SpeechSynthesisUtterance(wordToSpeak);
    utterance.lang = language;
    window.speechSynthesis.speak(utterance);
  };
  
  const handleSkipWord = async () => {
      if (isAwaitingFeedback || isListening || isImageLoading || nextAvailableWordIndex >= fullWordList.length || incorrectAttempts < 3) {
        return;
      }

      setIsImageLoading(true);
      setFeedbackText('กำลังหาคำศัพท์ใหม่...');
      
      const newWord = fullWordList[nextAvailableWordIndex];
      const newImageUrl = isImageGenerationEnabled 
        ? await generateVocabImage(newWord.english)
        : `https://loremflickr.com/400/300/${newWord.english},illustration,simple?lock=${newWord.english.replace(/\s/g, '')}`;


      const newWordData = [...wordData];
      newWordData[currentWordIndex] = { word: newWord, imageUrl: newImageUrl };
      
      setWordData(newWordData);
      setNextAvailableWordIndex(prev => prev + 1);
      setTranscript('');
      setIncorrectAttempts(0); // Reset for new word
      setFeedbackText('นี่คือคำศัพท์ใหม่!');
      // setIsImageLoading will be set to false by the useEffect watching currentWordDataItem
  };

  const targetLangWord = currentWord ? (language === Language.EN ? currentWord.english : currentWord.thai) : '';
  const translationWord = currentWord ? (language === Language.EN ? currentWord.thai : currentWord.english) : '';
  const areButtonsDisabled = isListening || isAwaitingFeedback || isImageLoading || !currentWord;
  const canSkip = incorrectAttempts >= 3;

  return (
    <div className="w-full h-full flex flex-col p-4 sm:p-6 overflow-hidden">
      <header className="flex-shrink-0 flex justify-between items-center mb-2">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-purple-700">ฝึกคำศัพท์กับ AI</h1>
          <p className="text-sm md:text-base text-gray-600">สะสม {MAX_WORDS_PER_ROUND} คำ เพื่อสร้างนิทานของคุณ!</p>
        </div>
        <div className="flex items-center space-x-2">
          {Array.from({ length: round - 1 }).map((_, i) => <div key={i} className="text-yellow-500"><BadgeIcon /></div>)}
        </div>
      </header>

      <div className="w-full bg-gray-200 rounded-full h-3 sm:h-4 mb-3 sm:mb-4 flex-shrink-0">
        <div className="bg-green-400 h-full rounded-full transition-all duration-500" style={{ width: `${(collectedWords.length / MAX_WORDS_PER_ROUND) * 100}%` }}></div>
      </div>
      
      <div className="flex-1 flex flex-col items-center justify-center bg-purple-50 rounded-2xl p-4 text-center min-h-0">
        {currentWord ? (
          <div className="w-full h-full flex flex-col md:grid md:grid-cols-2 md:gap-x-8 items-center">
            {/* --- Image Column (Left on Desktop) --- */}
            <div className="w-full max-w-sm md:max-w-none mx-auto h-40 md:h-full bg-white rounded-lg shadow-inner overflow-hidden flex items-center justify-center mb-3 md:mb-0">
              {isImageLoading ? (
                <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-purple-500" role="status" aria-label="Loading image"></div>
              ) : (
                <img src={currentWordDataItem?.imageUrl} alt={currentWord.english} className="w-full h-full object-contain" onLoad={() => setIsImageLoading(false)} />
              )}
            </div>

            {/* --- Controls Column (Right on Desktop) --- */}
            <div className="flex flex-col items-center justify-center md:items-start md:text-left h-full w-full">
              <div className="mb-2">
                <p className="text-4xl sm:text-5xl font-bold text-purple-800 break-words">{targetLangWord}</p>
                <p className="text-xl sm:text-2xl text-gray-500">({translationWord})</p>
              </div>

              <div className="h-10 text-xl font-semibold text-blue-600 mb-2 md:h-12 md:text-2xl truncate w-full">{transcript}</div>

              <div className="flex flex-wrap justify-center md:justify-start gap-2 sm:gap-3 mb-2">
                <button onClick={handleListenSound} disabled={areButtonsDisabled} className="px-4 py-2 bg-blue-500 text-white font-bold rounded-lg shadow-md hover:bg-blue-600 disabled:bg-gray-400 text-sm sm:text-base">ฟังเสียง</button>
                <button onClick={startListening} disabled={areButtonsDisabled || !recognition} className="px-4 py-2 bg-green-500 text-white font-bold rounded-lg shadow-md hover:bg-green-600 disabled:bg-gray-400 text-sm sm:text-base">
                  {isListening ? `ฟังอยู่... ${countdown}` : "พูดเลย"}
                </button>
                <button onClick={handleSkipWord} disabled={areButtonsDisabled || nextAvailableWordIndex >= fullWordList.length || !canSkip} className="px-4 py-2 bg-orange-400 text-white font-bold rounded-lg shadow-md hover:bg-orange-500 disabled:bg-gray-400 disabled:cursor-not-allowed text-sm sm:text-base">
                  {canSkip ? 'เปลี่ยนคำ' : `ลองอีก ${3 - incorrectAttempts} ครั้ง`}
                </button>
              </div>

              <p className="text-base sm:text-lg h-7 font-semibold text-purple-700">{feedbackText}</p>
            </div>
          </div>
        ) : (
          <p className="text-2xl text-gray-500">กำลังโหลดคำศัพท์...</p>
        )}
      </div>

      <div className="flex-shrink-0 mt-3 sm:mt-4">
        <h3 className="text-base font-semibold mb-2 text-purple-700">คลังคำศัพท์วิเศษ</h3>
        <div className="flex space-x-2 sm:space-x-4 h-10 sm:h-12 items-center">
          {Array.from({ length: MAX_WORDS_PER_ROUND }).map((_, i) => (
            <div key={i} className={`flex-1 h-full rounded-full flex items-center justify-center text-yellow-400 transition-all duration-500 ${collectedWords[i] ? 'bg-purple-500 scale-110' : 'bg-gray-200'}`}>
              {collectedWords[i] && <SparkleIcon />}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default VocabTrainer;