import React, { useState, useEffect } from 'react';
import { StoryTone } from '../types';
import { STORY_TONE_THAI } from '../constants';

// --- SVG Logo Component ---
const ImagiTaleLogo: React.FC = () => (
    <svg 
      className="w-full h-auto select-none" 
      viewBox="0 0 800 300" 
      xmlns="http://www.w3.org/2000/svg"
      style={{ filter: 'drop-shadow(0 6px 4px rgba(0,0,0,0.3)) drop-shadow(0 0 10px rgba(255, 237, 213, 0.5))' }}
    >
        <defs>
            <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fde68a" />
                <stop offset="50%" stopColor="#f9a8d4" />
                <stop offset="100%" stopColor="#c4b5fd" />
            </linearGradient>
            <filter id="subtle-glow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur in="SourceGraphic" stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
        </defs>

        <g transform="rotate(-4 400 150)">
            <text
                fontFamily="'Lilita One', cursive"
                fontSize="180"
                x="50%"
                y="50%"
                dominantBaseline="middle"
                textAnchor="middle"
                fill="url(#logo-gradient)"
                stroke="#6b21a8"
                strokeWidth="8"
                strokeLinejoin="round"
                paintOrder="stroke"
                filter="url(#subtle-glow)"
            >
                ImagiTale
            </text>

            {/* Sparkles */}
            <circle cx="100" cy="120" r="12" fill="#fff" opacity="0">
                 <animate attributeName="opacity" values="0;1;0" dur="2s" begin="0.5s" repeatCount="indefinite" />
            </circle>
            <circle cx="720" cy="210" r="15" fill="#fff" opacity="0">
                <animate attributeName="opacity" values="0;1;0" dur="2.5s" begin="0s" repeatCount="indefinite" />
            </circle>
            <circle cx="760" cy="90" r="9" fill="#fff" opacity="0">
                <animate attributeName="opacity" values="0;1;0" dur="1.8s" begin="1s" repeatCount="indefinite" />
            </circle>
        </g>
    </svg>
);


interface HomeScreenProps {
  onStart: () => void;
}

//--- Parallax Logic ---
interface ParallaxProps {
  parallaxOffset: { x: number; y: number };
}

// Custom hook to handle parallax effect
const useParallax = (strength: number = 20) => {
    const [offset, setOffset] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const handleMouseMove = (e: MouseEvent) => {
            const { clientX, clientY } = e;
            const { innerWidth, innerHeight } = window;
            const x = (clientX - innerWidth / 2) / strength;
            const y = (clientY - innerHeight / 2) / strength;
            setOffset({ x, y });
        };
        window.addEventListener('mousemove', handleMouseMove);
        return () => window.removeEventListener('mousemove', handleMouseMove);
    }, [strength]);

    return offset;
};

// Helper component for parallax layers
interface ParallaxLayerProps {
  children: React.ReactNode;
  offset: { x: number, y: number };
  depth: number;
  style?: React.CSSProperties;
}
const ParallaxLayer: React.FC<ParallaxLayerProps> = ({ children, offset, depth, style = {} }) => (
    <g style={{
        ...style,
        transform: `translate(${offset.x * depth}px, ${offset.y * depth}px)`,
        transition: 'transform 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
    }}>
        {children}
    </g>
);

//--- BACKGROUND 1: Enchanted Forest ---
const EnchantedForest: React.FC<ParallaxProps> = ({ parallaxOffset }) => (
  <svg className="absolute top-0 left-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="sky1" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#87CEEB" /><stop offset="100%" stopColor="#fca5a5" /></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#sky1)" />
    <ParallaxLayer offset={parallaxOffset} depth={-2} style={{ animation: `drift 120s infinite linear alternate` }}>
        <path d="M-100 200 C 100 150, 300 250, 500 200 S 900 100, 1100 200 S 1500 250, 1700 200 S 2100 150, 2100 150 V-10 H-100Z" fill="#ffffff" opacity="0.7" />
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={1}>
        <path d="M0,1080 V800 C200,750 400,820 600,800 S1000,700 1200,750 S1600,850 1920,820 V1080 Z" fill="#15803d" />
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={3}>
        <path d="M0,1080 V950 C300,920 500,980 700,960 S1100,900 1300,940 S1700,1000 1920,980 V1080 Z" fill="#22c55e" />
    </ParallaxLayer>
    {[...Array(3)].map((_, i) => (
      <ParallaxLayer key={i} offset={parallaxOffset} depth={6 + i * 2} style={{ animation: `fly ${10 + i * 2}s infinite ease-in-out ${i*1.5}s alternate`, transformOrigin: 'center' }}>
        <path d={`M${200 + i * 500} ${300 + i * 50} C ${210 + i * 500} ${290 + i * 50}, ${220 + i * 500} ${290 + i * 50}, ${230 + i * 500} ${300 + i * 50} L ${215 + i * 500} ${310 + i * 50} Z`} fill="#ff69b4" />
        <path d={`M${230 + i * 500} ${300 + i * 50} C ${240 + i * 500} ${290 + i * 50}, ${250 + i * 500} ${290 + i * 50}, ${260 + i * 500} ${300 + i * 50} L ${245 + i * 500} ${310 + i * 50} Z`} fill="#ff1493" />
      </ParallaxLayer>
    ))}
    <ParallaxLayer offset={parallaxOffset} depth={4} style={{ animation: 'sway 8s infinite ease-in-out alternate', transformOrigin: '400px 850px' }}>
      <path d="M400,850 L390,600 C370,550 430,550 410,600 Z" fill="#654321" /><circle cx="400" cy="550" r="150" fill="#14532d" />
    </ParallaxLayer>
  </svg>
);

//--- BACKGROUND 2: Starry Night ---
const StarryNight: React.FC<ParallaxProps> = ({ parallaxOffset }) => (
  <svg className="absolute top-0 left-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="sky2" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#0f172a" /><stop offset="100%" stopColor="#3730a3" /></linearGradient><filter id="glow"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter></defs>
    <rect width="1920" height="1080" fill="url(#sky2)" />
    <g filter="url(#glow)">
        <ParallaxLayer offset={parallaxOffset} depth={-1}>
            {[...Array(30)].map((_, i) => <circle key={i} cx={Math.random() * 1920} cy={Math.random() * 800} r={Math.random() * 2 + 0.5} fill="#fef08a" style={{ animation: `twinkle ${Math.random() * 4 + 3}s infinite ease-in-out ${Math.random() * 5}s` }} />)}
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={-3}>
            {[...Array(70)].map((_, i) => <circle key={i} cx={Math.random() * 1920} cy={Math.random() * 800} r={Math.random() * 1.5 + 0.5} fill="#fef08a" style={{ animation: `twinkle ${Math.random() * 4 + 3}s infinite ease-in-out ${Math.random() * 5}s` }} />)}
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={-4}>
            <circle cx="1500" cy="300" r="100" fill="#fef9c3" />
        </ParallaxLayer>
    </g>
    <ParallaxLayer offset={parallaxOffset} depth={2}>
        <path d="M0,1080 V850 C250,810 450,870 650,850 S1050,770 1250,820 S1650,890 1920,870 V1080 Z" fill="#0c2e1f" />
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={4}>
        <path d="M0,1080 V950 C300,920 500,980 700,960 S1100,900 1300,940 S1700,1000 1920,980 V1080 Z" fill="#081c15" />
    </ParallaxLayer>
  </svg>
);

//--- BACKGROUND 3: Underwater Wonder ---
const UnderwaterWonder: React.FC<ParallaxProps> = ({ parallaxOffset }) => {
    const kelpPositions = [200, 500, 1300, 1550, 1800];
    return (
      <svg className="absolute top-0 left-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <defs><linearGradient id="water" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#3b82f6" /><stop offset="100%" stopColor="#1e3a8a" /></linearGradient></defs>
        <rect width="1920" height="1080" fill="url(#water)" />
        <ParallaxLayer offset={parallaxOffset} depth={-3}>
          {[...Array(20)].map((_, i) => <circle key={i} cx={Math.random() * 1920} cy={1100} r={Math.random() * 15 + 5} fill="white" opacity="0.1" style={{ animation: `rise ${Math.random() * 20 + 10}s linear infinite ${Math.random() * 15}s` }} />)}
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={5}>
            {[...Array(30)].map((_, i) => <circle key={i} cx={Math.random() * 1920} cy={1100} r={Math.random() * 10 + 3} fill="white" opacity="0.3" style={{ animation: `rise ${Math.random() * 15 + 8}s linear infinite ${Math.random() * 12}s` }} />)}
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={1}>
            <path d="M0,1080 V900 C 300,850 400,950 700,920 S 1000,880 1300,930 S 1600,900 1920,940 V1080 Z" fill="#d4a373" />
        </ParallaxLayer>
        {kelpPositions.map((xPos, i) => (
            <ParallaxLayer key={i} offset={parallaxOffset} depth={2 + i * 0.5} style={{ animation: `sway ${5 + i}s ease-in-out infinite alternate` }}>
                <path d={`M${xPos},1080 C ${xPos - 20},900 ${xPos + 20},800 ${xPos},700`} stroke="#0d9488" strokeWidth="15" fill="none" />
            </ParallaxLayer>
        ))}
      </svg>
    );
};

//--- BACKGROUND 4: Sunset Mountains ---
const SunsetMountains: React.FC<ParallaxProps> = ({ parallaxOffset }) => (
  <svg className="absolute top-0 left-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="sunset" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#f97316" /><stop offset="50%" stopColor="#ec4899" /><stop offset="100%" stopColor="#4f46e5" /></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#sunset)" />
    <ParallaxLayer offset={parallaxOffset} depth={-1} style={{ animation: `pulse 5s infinite` }}>
      <circle cx="960" cy="550" r="100" fill="#fef08a" />
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={2} style={{ animation: `drift 180s infinite linear alternate` }}>
      <path d="M-100,1080 V800 L400,900 L800,750 L1200,850 L1600,780 L2000,820 V1080 Z" fill="#312e81" />
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={4}>
      <path d="M-100,1080 V850 L500,950 L900,820 L1300,900 L1700,850 L2000,900 V1080 Z" fill="#1e1b4b" />
    </ParallaxLayer>
  </svg>
);

//--- BACKGROUND 5: Candy Dream ---
const CandyDream: React.FC<ParallaxProps> = ({ parallaxOffset }) => (
  <svg className="absolute top-0 left-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="candyky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#fbcfe8" /><stop offset="100%" stopColor="#f0abfc" /></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#candyky)" />
    <ParallaxLayer offset={parallaxOffset} depth={-2} style={{ animation: `drift 80s infinite linear alternate` }}>
      <path d="M-200 300 C -100 250, 0 300, 100 280 S 300 250, 400 300 S 500 350, 600 300 H 2200 V 1080 H-200Z" fill="#faf5ff" />
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={1}>
      <path d="M0,1080 V800 Q 480,600 960,800 T 1920,800 V1080 Z" fill="#f9a8d4" />
    </ParallaxLayer>
     <ParallaxLayer offset={parallaxOffset} depth={3}>
      <path d="M0,1080 V900 Q 480,750 960,900 T 1920,900 V1080 Z" fill="#f472b6" />
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={5} style={{ animation: 'sway 8s infinite ease-in-out alternate', transformOrigin: '400px 900px' }}>
      <rect x="390" y="700" width="20" height="200" fill="#fef9c3" />
      <circle cx="400" cy="650" r="100" fill="#a5f3fc" style={{ animation: `pulse 5s infinite alternate` }} />
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={7} style={{ animation: 'sway 10s infinite ease-in-out alternate', transformOrigin: '1400px 850px' }}>
      <rect x="1390" y="750" width="20" height="100" fill="#fef9c3" />
      <circle cx="1400" cy="700" r="80" fill="#fca5a5" style={{ animation: `pulse 4s infinite alternate .5s` }} />
    </ParallaxLayer>
  </svg>
);

//--- BACKGROUND 6: Winter Bliss ---
const WinterBliss: React.FC<ParallaxProps> = ({ parallaxOffset }) => (
  <svg className="absolute top-0 left-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="wintersky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#e0f2fe" /><stop offset="100%" stopColor="#7dd3fc" /></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#wintersky)" />
    <ParallaxLayer offset={parallaxOffset} depth={5}>
      {[...Array(50)].map((_, i) => <circle key={i} cx={Math.random() * 1920} r={Math.random() * 3 + 1} fill="white" opacity="0.8" style={{ animation: `fall ${Math.random() * 10 + 5}s linear infinite ${Math.random() * 15}s` }} />)}
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={-2}>
        {[...Array(50)].map((_, i) => <circle key={i} cx={Math.random() * 1920} r={Math.random() * 2 + 1} fill="white" opacity="0.5" style={{ animation: `fall ${Math.random() * 12 + 8}s linear infinite ${Math.random() * 18}s` }} />)}
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={1}>
        <path d="M0,1080 V900 C 480,850 960,950 1920,900 V1080 Z" fill="#f8fafc" />
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={2}>
        <path d="M0,1080 V950 C 480,920 960,980 1920,950 V1080 Z" fill="#e2e8f0" />
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={4}>
      <path d="M1350 950 L 1650 950 L 1700 850 L 1500 750 L 1300 850 Z" fill="#a16207" />
      <rect x="1400" y="850" width="200" height="100" fill="#78350f" />
      <circle cx="1570" cy="890" r="15" fill="#fef08a" style={{ animation: `pulse 2s infinite` }} />
    </ParallaxLayer>
  </svg>
);

//--- BACKGROUND 7: Autumn Falls ---
const AutumnFalls: React.FC<ParallaxProps> = ({ parallaxOffset }) => (
  <svg className="absolute top-0 left-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
    <defs><linearGradient id="autumnsky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#fde68a" /><stop offset="100%" stopColor="#fb923c" /></linearGradient></defs>
    <rect width="1920" height="1080" fill="url(#autumnsky)" />
    <ParallaxLayer offset={parallaxOffset} depth={1}>
      <path d="M0,1080 V850 C300,800 600,900 960,850 S1500,800 1920,880 V1080 Z" fill="#b45309" />
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={-2}>
        <g style={{ animation: 'sway 8s infinite ease-in-out alternate', transformOrigin: '500px 900px' }}>
            <path d="M500,900 L490,650 C470,600 530,600 510,650 Z" fill="#5c2d0d" />
            <circle cx="500" cy="600" r="150" fill="#f97316" />
        </g>
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={3}>
        <g style={{ animation: 'sway 10s infinite ease-in-out alternate .5s', transformOrigin: '1300px 920px' }}>
            <path d="M1300,920 L1295,750 C1285,720 1315,720 1305,750 Z" fill="#5c2d0d" />
            <circle cx="1300" cy="720" r="100" fill="#dc2626" />
        </g>
    </ParallaxLayer>
    <ParallaxLayer offset={parallaxOffset} depth={6}>
      {[...Array(30)].map((_, i) => <circle key={i} cx={Math.random() * 1920} r={Math.random() * 5 + 3} fill={['#f97316', '#dc2626', '#f59e0b'][i%3]} opacity="0.8" style={{ animation: `fall ${Math.random() * 8 + 6}s linear infinite ${Math.random() * 14}s` }} />)}
    </ParallaxLayer>
  </svg>
);

//--- BACKGROUND 8: Magic Meadow ---
const MagicMeadow: React.FC<ParallaxProps> = ({ parallaxOffset }) => {
    const flowerPositions = [150, 350, 550, 1250, 1450, 1650, 1800];
    return (
      <svg className="absolute top-0 left-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <defs><linearGradient id="meadowsky" x1="0%" y1="0%" x2="0%" y2="100%"><stop offset="0%" stopColor="#a5b4fc" /><stop offset="100%" stopColor="#fbcfe8" /></linearGradient></defs>
        <rect width="1920" height="1080" fill="url(#meadowsky)" />
        <ParallaxLayer offset={parallaxOffset} depth={1}>
            <path d="M0,1080 V880 C250,840 450,900 650,880 S1050,800 1250,850 S1650,920 1920,900 V1080 Z" fill="#4ade80" />
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={3}>
            <path d="M0,1080 V950 C300,920 500,980 700,960 S1100,900 1300,940 S1700,1000 1920,980 V1080 Z" fill="#86efac" />
        </ParallaxLayer>
        {flowerPositions.map((xPos, i) => (
          <ParallaxLayer key={i} offset={parallaxOffset} depth={4 + i*0.5} style={{ animation: `sway ${6+i*0.5}s infinite ease-in-out alternate` }}>
            <g transform={`translate(${xPos}, 920)`}>
                <rect y="0" width="10" height="50" fill="#166534" />
                <circle cy="-20" r="30" fill={['#f472b6', '#c084fc', '#facc15'][i%3]} />
            </g>
          </ParallaxLayer>
        ))}
        <ParallaxLayer offset={parallaxOffset} depth={-2}>
            {[...Array(20)].map((_, i) => <circle key={i} cx={Math.random() * 1920} cy={1100} r={Math.random() * 4 + 2} fill="#fef08a" opacity="0.4" style={{ animation: `rise ${Math.random() * 15 + 10}s linear infinite ${Math.random() * 25}s` }} />)}
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={5}>
            {[...Array(20)].map((_, i) => <circle key={i} cx={Math.random() * 1920} cy={1100} r={Math.random() * 3 + 1} fill="#fef08a" opacity="0.7" style={{ animation: `rise ${Math.random() * 12 + 8}s linear infinite ${Math.random() * 20}s` }} />)}
        </ParallaxLayer>
      </svg>
    );
};


//--- BACKGROUND 9: Cosmic Voyage ---
const CosmicVoyage: React.FC<ParallaxProps> = ({ parallaxOffset }) => (
    <svg className="absolute top-0 left-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <defs><radialGradient id="space"><stop offset="0%" stopColor="#4c1d95" /><stop offset="100%" stopColor="#0c0a09" /></radialGradient></defs>
        <rect width="1920" height="1080" fill="url(#space)" />
        <ParallaxLayer offset={parallaxOffset} depth={-1}>
            {[...Array(100)].map((_, i) => <circle key={i} cx={Math.random() * 1920} cy={Math.random() * 1080} r={Math.random() * 1 + 0.5} fill="white" style={{ animation: `twinkle ${Math.random() * 5 + 2}s infinite` }} />)}
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={-2}>
            {[...Array(100)].map((_, i) => <circle key={i} cx={Math.random() * 1920} cy={Math.random() * 1080} r={Math.random() * 1.5 + 0.5} fill="white" style={{ animation: `twinkle ${Math.random() * 5 + 2}s infinite` }} />)}
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={-3}>
            <circle cx="300" cy="300" r="100" fill="#f87171" opacity="0.8" />
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={-5}>
            <circle cx="1600" cy="700" r="150" fill="#60a5fa" opacity="0.8" />
            <circle cx="1550" cy="650" r="150" fill="#d4d4d8" opacity="0.2" />
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={4} style={{ animation: `drift 80s infinite linear alternate-reverse` }}>
            <circle cx="300" cy="500" r="20" fill="#a1a1aa" />
            <circle cx="350" cy="550" r="15" fill="#a1a1aa" />
            <circle cx="400" cy="480" r="25" fill="#71717a" />
        </ParallaxLayer>
    </svg>
);

//--- BACKGROUND 10: Sky Islands ---
const SkyIslands: React.FC<ParallaxProps> = ({ parallaxOffset }) => (
    <svg className="absolute top-0 left-0 w-full h-full object-cover" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice">
        <defs><linearGradient id="sky10" y2="1"><stop offset="0" stopColor="#a7ddff" /><stop offset="1" stopColor="#fceabb" /></linearGradient></defs>
        <rect width="1920" height="1080" fill="url(#sky10)" />
        <ParallaxLayer offset={parallaxOffset} depth={-2} style={{ animation: `drift 150s infinite linear alternate` }}>
            <path d="M-200 300 C -100 250, 0 300, 100 280 S 300 250, 400 300 S 500 350, 600 300 H 2200 V 1080 H-200Z" fill="white" opacity="0.6"/>
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={-1} style={{ animation: `float-subtle 10s infinite ease-in-out` }}>
            <ellipse cx="500" cy="400" rx="250" ry="80" fill="#4d7c0f" />
            <path d="M250,400 C 300,500 700,500 750,400" fill="#65a30d" />
        </ParallaxLayer>
        <ParallaxLayer offset={parallaxOffset} depth={4} style={{ animation: `float-subtle 12s infinite ease-in-out .5s` }}>
            <ellipse cx="1500" cy="700" rx="300" ry="100" fill="#4d7c0f" />
            <path d="M1200,700 C 1300,850 1700,850 1800,700" fill="#65a30d" />
            <path d="M1400 790 C 1420 850 1480 850 1500 790" fill="#0284c7" opacity="0.7"/>
        </ParallaxLayer>
    </svg>
);

const toneBackgroundMap: Record<StoryTone, React.FC<ParallaxProps>[]> = {
    [StoryTone.ADVENTURE]: [SunsetMountains, SkyIslands],
    [StoryTone.HEARTWARMING]: [AutumnFalls, WinterBliss],
    [StoryTone.FUNNY]: [CandyDream, UnderwaterWonder],
    [StoryTone.DREAMY]: [StarryNight, CosmicVoyage],
    [StoryTone.MYSTERY]: [EnchantedForest],
    [StoryTone.RELATIONSHIPS]: [MagicMeadow],
};


const HomeScreen: React.FC<HomeScreenProps> = ({ onStart }) => {
  const subtitleStrokeColor = '#86198f'; // Rich Magenta
  const parallaxOffset = useParallax(40); // Adjust strength for desired effect
  const [theme, setTheme] = useState<{ tone: StoryTone; BackgroundComponent: React.FC<ParallaxProps> } | null>(null);

  useEffect(() => {
    const tones = Object.values(StoryTone);
    const randomTone = tones[Math.floor(Math.random() * tones.length)];
    const availableBgs = toneBackgroundMap[randomTone] || toneBackgroundMap[StoryTone.ADVENTURE];
    const RandomBg = availableBgs[Math.floor(Math.random() * availableBgs.length)];
    setTheme({ tone: randomTone, BackgroundComponent: RandomBg });
  }, []);

  return (
    <div className="w-full h-full relative overflow-hidden flex flex-col items-center justify-center text-center p-8 gap-8 sm:gap-10">
      {theme && <theme.BackgroundComponent parallaxOffset={parallaxOffset} />}

      <header className="relative z-10 w-full animate-[bounce-in_1s_ease-out]">
        <div className="w-full max-w-lg mx-auto px-4">
          <ImagiTaleLogo />
        </div>
        <p 
          className="mt-2 text-lg sm:text-xl text-amber-50 font-bold"
          style={{
            textShadow: `-1px -1px 0 ${subtitleStrokeColor}, 1px -1px 0 ${subtitleStrokeColor}, -1px 1px 0 ${subtitleStrokeColor}, 1px 1px 0 ${subtitleStrokeColor}, 0 2px 4px rgba(0,0,0,0.2)`
          }}
        >
          การผจญภัยในโลกนิทาน AI กำลังรอคุณอยู่!
        </p>
      </header>
      
      <footer className="relative z-10 w-full animate-[bounce-in_1s_ease-out_0.1s]">
        <button
          onClick={onStart}
          className="px-12 py-5 font-['Lilita_One'] text-yellow-200 text-3xl sm:text-4xl rounded-2xl shadow-2xl transform transition-all duration-200 ease-in-out 
                     bg-gradient-to-b from-sky-400 to-cyan-500 
                     border-b-8 border-sky-700 
                     hover:from-sky-300 hover:to-cyan-400 
                     active:border-b-2 active:translate-y-1"
          style={{
             textShadow: `-2px -2px 0 #0c4a6e, 2px -2px 0 #0c4a6e, -2px 2px 0 #0c4a6e, 2px 2px 0 #0c4a6e`
          }}
        >
          เริ่มต้น
        </button>
      </footer>
    </div>
  );
};

export default HomeScreen;