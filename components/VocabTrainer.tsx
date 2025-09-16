import React, { useState, useEffect, useMemo } from 'react';
import { Word, WordCategory, Language } from '../types';
import { VOCABULARY, WORD_CATEGORY_THAI, MAX_WORDS_PER_ROUND } from '../constants';
import { generateVocabImage } from '../services/geminiService';
import SparkleIcon from './icons/SparkleIcon';

interface VocabTrainerProps {
  onComplete: (words: Word[]) => void;
  language: Language;
}

const VocabTrainer: React.FC<VocabTrainerProps> = ({ onComplete, language }) => {
  const [selectedCategory, setSelectedCategory] = useState<WordCategory | null>(null);
  const [selectedWords, setSelectedWords] = useState<Word[]>([]);
  const [wordImages, setWordImages] = useState<Record<string, string>>({});
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  const currentWords = useMemo(() => selectedCategory ? VOCABULARY[selectedCategory] : [], [selectedCategory]);

  useEffect(() => {
    if (selectedCategory && currentWords.length > 0) {
      setIsLoadingImages(true);
      const fetchImages = async () => {
        const imagePromises = currentWords.map(word => generateVocabImage(word.english));
        try {
            const urls = await Promise.all(imagePromises);
            const newImageMap: Record<string, string> = {};
            currentWords.forEach((word, index) => {
              newImageMap[word.english] = urls[index];
            });
            setWordImages(prev => ({ ...prev, ...newImageMap }));
        } catch (error) {
            console.error("Failed to fetch all word images", error);
        } finally {
            setIsLoadingImages(false);
        }
      };
      fetchImages();
    }
  }, [selectedCategory, currentWords]);
  
  const handleSelectCategory = (category: WordCategory) => {
    setSelectedCategory(category);
  };

  const handleSelectWord = (word: Word) => {
    setSelectedWords(prev => {
      if (prev.find(w => w.english === word.english)) {
        return prev.filter(w => w.english !== word.english);
      }
      if (prev.length < MAX_WORDS_PER_ROUND) {
        return [...prev, word];
      }
      return prev;
    });
  };

  const isWordSelected = (word: Word) => {
    return selectedWords.some(w => w.english === word.english);
  };
  
  const renderCategorySelection = () => (
    <div className="w-full max-w-4xl mx-auto p-4 sm:p-6">
      <h1 className="text-3xl sm:text-4xl font-bold text-white text-center mb-6" style={{ textShadow: '0 2px 4px rgba(0,0,0,0.5)' }}>
        {language === Language.TH ? 'เลือกหมวดหมู่คำศัพท์' : 'Choose a Word Category'}
      </h1>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {Object.values(WordCategory).map(category => (
          <button
            key={category}
            onClick={() => handleSelectCategory(category)}
            className="p-4 sm:p-6 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg text-purple-800 font-semibold text-lg transition-transform transform hover:scale-105"
          >
            {WORD_CATEGORY_THAI[category]}
          </button>
        ))}
      </div>
    </div>
  );
  
  const renderWordSelection = () => (
    <div className="flex flex-col h-full w-full">
      <header className="p-4 bg-white/80 backdrop-blur-sm shadow-md z-10">
        <button onClick={() => setSelectedCategory(null)} className="text-purple-600 font-semibold hover:underline">
           &larr; {language === Language.TH ? 'กลับไปเลือกหมวดหมู่' : 'Back to Categories'}
        </button>
         <h2 className="text-2xl font-bold text-center text-gray-800 mt-2">
            {language === Language.TH ? `เลือก ${MAX_WORDS_PER_ROUND} คำ` : `Choose ${MAX_WORDS_PER_ROUND} Words`}
            <span className="text-purple-600"> ({selectedWords.length}/{MAX_WORDS_PER_ROUND})</span>
        </h2>
      </header>
      
      <main className="flex-1 overflow-y-auto p-4">
        {isLoadingImages && <div className="text-center text-white text-xl">กำลังโหลดรูปภาพ...</div>}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {currentWords.map(word => (
            <button
              key={word.english}
              onClick={() => handleSelectWord(word)}
              className={`relative rounded-xl overflow-hidden shadow-lg transform transition-all duration-300 ${isWordSelected(word) ? 'scale-105 ring-4 ring-yellow-400' : 'hover:scale-105'}`}
            >
              <div className="absolute inset-0 bg-black/30"></div>
              {wordImages[word.english] ? (
                  <img src={wordImages[word.english]} alt={word.english} className="w-full h-48 object-cover" />
              ) : (
                <div className="w-full h-48 bg-gray-200 flex items-center justify-center">
                   <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              )}
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                  <p className="text-white font-bold text-lg">{language === Language.TH ? word.thai : word.english}</p>
              </div>
               {isWordSelected(word) && (
                <div className="absolute top-2 right-2 w-8 h-8 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" /></svg>
                </div>
              )}
            </button>
          ))}
        </div>
      </main>
      
      <footer className="p-4 bg-white/80 backdrop-blur-sm shadow-inner z-10">
         <button
            onClick={() => onComplete(selectedWords)}
            disabled={selectedWords.length < MAX_WORDS_PER_ROUND}
            className="w-full flex items-center justify-center gap-3 px-8 py-4 bg-gradient-to-r from-green-500 to-teal-500 text-white font-bold text-2xl rounded-xl shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-transform transform hover:scale-105"
          >
             <SparkleIcon />
            {language === Language.TH ? 'เริ่มสร้างนิทาน!' : 'Create Story!'}
          </button>
      </footer>
    </div>
  );

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-purple-600 to-indigo-800 p-4">
      {selectedCategory ? renderWordSelection() : renderCategorySelection()}
    </div>
  );
};

export default VocabTrainer;
