
import React, { Fragment } from 'react';
import { Language, StoryTone, AIVoice } from '../types';
import { STORY_TONE_THAI } from '../constants';
import CloseIcon from './icons/CloseIcon';
import AdventureIcon from './icons/AdventureIcon';
import DreamyIcon from './icons/DreamyIcon';
import FunnyIcon from './icons/FunnyIcon';
import HeartwarmingIcon from './icons/HeartwarmingIcon';
import MysteryIcon from './icons/MysteryIcon';
import RelationshipsIcon from './icons/RelationshipsIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  storyTone: StoryTone;
  setStoryTone: (tone: StoryTone) => void;
  aiVoice: AIVoice;
  setAiVoice: (voice: AIVoice) => void;
  isImageGenerationEnabled: boolean;
  setIsImageGenerationEnabled: (enabled: boolean) => void;
}

const toneIcons: Record<StoryTone, React.ReactNode> = {
  [StoryTone.ADVENTURE]: <AdventureIcon />,
  [StoryTone.HEARTWARMING]: <HeartwarmingIcon />,
  [StoryTone.FUNNY]: <FunnyIcon />,
  [StoryTone.DREAMY]: <DreamyIcon />,
  [StoryTone.MYSTERY]: <MysteryIcon />,
  [StoryTone.RELATIONSHIPS]: <RelationshipsIcon />,
};

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  language,
  setLanguage,
  storyTone,
  setStoryTone,
  aiVoice,
  setAiVoice,
  isImageGenerationEnabled,
  setIsImageGenerationEnabled,
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 transition-opacity"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-title"
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative transform transition-all"
        onClick={e => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-800"
          aria-label="Close settings"
        >
          <CloseIcon />
        </button>
        
        <h2 id="settings-title" className="text-2xl font-bold text-gray-800 mb-6">ตั้งค่า</h2>

        <div className="space-y-6">
          {/* Language Selection */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-700 mb-2">ภาษา</legend>
            <div className="flex gap-4">
              {(Object.keys(Language) as Array<keyof typeof Language>).map(key => (
                <button
                  key={key}
                  onClick={() => setLanguage(Language[key])}
                  className={`flex-1 p-3 rounded-lg border-2 transition-all ${language === Language[key] ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'}`}
                >
                  {Language[key] === Language.TH ? '🇹🇭 ภาษาไทย' : '🇬🇧 English'}
                </button>
              ))}
            </div>
          </fieldset>

          {/* AI Voice Selection */}
          <fieldset>
             <legend className="text-lg font-semibold text-gray-700 mb-2">เสียง AI</legend>
             <select
                value={aiVoice}
                onChange={(e) => setAiVoice(e.target.value as AIVoice)}
                className="w-full p-3 bg-gray-100 border-2 border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
             >
                {(Object.keys(AIVoice) as Array<keyof typeof AIVoice>).map(key => (
                    <option key={key} value={AIVoice[key]}>{AIVoice[key]}</option>
                ))}
             </select>
          </fieldset>

          {/* Story Tone Selection */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-700 mb-2">แนวของนิทาน</legend>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {(Object.keys(StoryTone) as Array<keyof typeof StoryTone>).map(key => (
                    <button
                        key={key}
                        onClick={() => setStoryTone(StoryTone[key])}
                        className={`flex flex-col items-center justify-center gap-2 p-3 rounded-lg border-2 text-center transition-all ${storyTone === StoryTone[key] ? 'bg-purple-600 text-white border-purple-600 shadow-md' : 'bg-gray-100 hover:bg-gray-200 border-gray-200'}`}
                    >
                        <div className="h-10 w-10">{toneIcons[StoryTone[key]]}</div>
                        <span className="font-semibold text-sm">{STORY_TONE_THAI[StoryTone[key]]}</span>
                    </button>
                ))}
            </div>
          </fieldset>

          {/* AI Image Generation Toggle */}
          <fieldset>
            <legend className="text-lg font-semibold text-gray-700 mb-2">รูปภาพประกอบ</legend>
            <div className="flex items-center justify-between bg-gray-100 p-3 rounded-lg">
              <label htmlFor="image-toggle" className="text-gray-600 font-medium">
                สร้างรูปภาพด้วย AI
              </label>
              <label htmlFor="image-toggle" className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="image-toggle"
                  className="sr-only peer" 
                  checked={isImageGenerationEnabled}
                  onChange={e => setIsImageGenerationEnabled(e.target.checked)} 
                />
                <div className="w-11 h-6 bg-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-purple-600"></div>
              </label>
            </div>
             <p className="text-xs text-gray-500 mt-2">
                การสร้างรูปภาพอาจใช้เวลานานขึ้นเล็กน้อย
            </p>
          </fieldset>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;