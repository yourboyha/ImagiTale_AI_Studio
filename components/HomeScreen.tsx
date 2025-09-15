import React, { useMemo } from 'react';

interface HomeScreenProps {
  onStart: () => void;
}

// Collection of beautiful, child-friendly gradients
const gradients = [
  'linear-gradient(to bottom right, #a78bfa, #f472b6, #fbbf24)', // Purple -> Pink -> Yellow
  'linear-gradient(to bottom right, #60a5fa, #34d399, #fde047)', // Blue -> Green -> Yellow
  'linear-gradient(to bottom right, #f87171, #fb923c, #facc15)', // Red -> Orange -> Amber
  'linear-gradient(to bottom right, #4ade80, #2dd4bf, #38bdf8)', // Green -> Teal -> Sky Blue
  'linear-gradient(to bottom right, #c084fc, #f472b6, #ef4444)', // Purple -> Pink -> Red
  'linear-gradient(to bottom right, #fb923c, #f97316, #f59e0b)', // Orange -> Dark Orange -> Amber
  'linear-gradient(to bottom right, #22d3ee, #a3e635, #fde047)', // Cyan -> Lime -> Yellow
];


const HomeScreen: React.FC<HomeScreenProps> = ({ onStart }) => {
  // Select a random gradient every time the component renders
  const randomGradient = useMemo(() => {
    const randomIndex = Math.floor(Math.random() * gradients.length);
    return gradients[randomIndex];
  }, []);

  // Using a dark purple for the stroke to ensure contrast against all gradients
  const strokeColor = '#581c87'; // Tailwind purple-900

  return (
    <div 
      className="w-full h-full grid place-items-center text-center p-4 overflow-y-auto transition-all duration-1000"
      style={{ 
        backgroundImage: randomGradient,
      }}
    >
      <div 
        className="bg-gradient-to-br from-white/80 to-white/60 backdrop-blur-md p-6 sm:p-10 rounded-[3rem] shadow-2xl border-4 border-white/50"
        style={{ animation: 'float 6s ease-in-out infinite' }}
      >
        <h1 
          className="text-5xl sm:text-7xl lg:text-8xl text-white font-extrabold" 
          style={{ 
            letterSpacing: '0.025em', // Add breathing room for the stroke
            textShadow: `
              -2px -2px 0 ${strokeColor},  
               2px -2px 0 ${strokeColor},
              -2px  2px 0 ${strokeColor},
               2px  2px 0 ${strokeColor},
               0 5px 10px rgba(0,0,0,0.3)
            `
          }}
        >
          ImagiTale
        </h1>
        <p 
          className="mt-4 text-lg md:text-xl text-white font-bold"
          style={{
            textShadow: `
              -1.5px -1.5px 0 ${strokeColor},  
               1.5px -1.5px 0 ${strokeColor},
              -1.5px  1.5px 0 ${strokeColor},
               1.5px  1.5px 0 ${strokeColor},
               0 3px 6px rgba(0,0,0,0.3)
            `
          }}
        >
          การผจญภัยในโลกนิทาน AI กำลังรอคุณอยู่!
        </p>
        <button
          onClick={onStart}
          className="mt-8 px-8 py-4 text-gray-800 text-xl sm:text-2xl font-bold rounded-full shadow-2xl transform transition-all duration-200 ease-in-out 
                     bg-gradient-to-b from-yellow-300 to-yellow-500 
                     border-b-8 border-yellow-700 
                     hover:from-yellow-200 hover:to-yellow-400 
                     active:border-b-2 active:translate-y-1"
        >
          เริ่มต้น
        </button>
      </div>
    </div>
  );
};

export default HomeScreen;