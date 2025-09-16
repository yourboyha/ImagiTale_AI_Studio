import React from 'react';
import CloseIcon from './icons/CloseIcon';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  isDebugMode: boolean;
  setIsDebugMode: (value: boolean) => void;
  isImageGenerationEnabled: boolean;
  setIsImageGenerationEnabled: (value: boolean) => void;
  isStoryImageGenerationEnabled: boolean;
  setIsStoryImageGenerationEnabled: (value: boolean) => void;
  showSkipButton: boolean;
  setShowSkipButton: (value: boolean) => void;
}

const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  isDebugMode,
  setIsDebugMode,
  isImageGenerationEnabled,
  setIsImageGenerationEnabled,
  isStoryImageGenerationEnabled,
  setIsStoryImageGenerationEnabled,
  showSkipButton,
  setShowSkipButton,
}) => {
  if (!isOpen) return null;

  const handleDebugModeToggle = () => {
    const newDebugModeState = !isDebugMode;
    setIsDebugMode(newDebugModeState);

    if (newDebugModeState) {
      setIsImageGenerationEnabled(false);
      setIsStoryImageGenerationEnabled(false);
      setShowSkipButton(true);
    } else {
      setIsImageGenerationEnabled(true);
      setIsStoryImageGenerationEnabled(true);
      setShowSkipButton(false);
    }
  };

  return (
    <div 
      className="absolute inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      onClick={onClose}
      aria-modal="true"
      role="dialog"
    >
      <div 
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl p-6 m-4"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-gray-400 hover:text-gray-700 transition-colors"
          aria-label="Close settings"
        >
          <CloseIcon />
        </button>
        
        <h2 className="text-2xl font-bold text-purple-700 mb-6">ตั้งค่าระบบ</h2>
        
        {/* Debug Options */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold text-gray-800 border-b pb-2 mb-3">Debug Options</h3>
          <div className="space-y-3">
             <label className="flex items-center justify-between space-x-2 bg-purple-50 p-3 rounded-lg cursor-pointer select-none">
              <span className="font-semibold text-purple-800">โหมดนักพัฒนา</span>
              <input 
                type="checkbox" 
                checked={isDebugMode} 
                onChange={handleDebugModeToggle}
                className="form-checkbox h-5 w-5 text-purple-500 bg-gray-200 border-gray-300 rounded focus:ring-purple-600"
              />
            </label>
            
            <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isDebugMode ? 'max-h-96 opacity-100' : 'max-h-0 opacity-0'}`}>
              <div className="pl-4 border-l-2 border-purple-200 space-y-3 pt-3">
                <label className="flex items-center justify-between space-x-2 bg-gray-100 p-3 rounded-lg cursor-pointer select-none">
                  <span className="text-sm font-semibold text-gray-700">สร้างภาพคำศัพท์ AI</span>
                  <input 
                    type="checkbox" 
                    checked={isImageGenerationEnabled} 
                    onChange={() => setIsImageGenerationEnabled(!isImageGenerationEnabled)}
                    className="form-checkbox h-5 w-5 text-purple-500 bg-gray-200 border-gray-300 rounded focus:ring-purple-600"
                  />
                </label>
                <label className="flex items-center justify-between space-x-2 bg-gray-100 p-3 rounded-lg cursor-pointer select-none">
                  <span className="text-sm font-semibold text-gray-700">สร้างภาพนิทาน AI</span>
                  <input 
                    type="checkbox" 
                    checked={isStoryImageGenerationEnabled} 
                    onChange={() => setIsStoryImageGenerationEnabled(!isStoryImageGenerationEnabled)}
                    className="form-checkbox h-5 w-5 text-green-500 bg-gray-200 border-gray-300 rounded focus:ring-green-600"
                  />
                </label>
                <label className="flex items-center justify-between space-x-2 bg-gray-100 p-3 rounded-lg cursor-pointer select-none">
                  <span className="text-sm font-semibold text-gray-700">แสดงปุ่มข้ามนิทาน</span>
                  <input 
                    type="checkbox" 
                    checked={showSkipButton} 
                    onChange={() => setShowSkipButton(!showSkipButton)}
                    className="form-checkbox h-5 w-5 text-blue-500 bg-gray-200 border-gray-300 rounded focus:ring-blue-600"
                  />
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsModal;
