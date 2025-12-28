import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Trophy, Plus, X, RotateCcw, ChevronLeft, User, Sparkles } from 'lucide-react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { calculatePoints, WINDS, PLAYER_COLORS, type Player, type HandRecord } from './scoring';

// --- Utils ---
function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// --- Components ---

// 1. Comic Button
const ComicButton = ({ 
  children, 
  onClick, 
  className, 
  variant = 'primary',
  size = 'md',
  disabled = false
}: { 
  children: React.ReactNode; 
  onClick?: () => void; 
  className?: string;
  variant?: 'primary' | 'secondary' | 'accent' | 'outline' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'icon';
  disabled?: boolean;
}) => {
  const variants = {
    primary: 'bg-[#FF9E00] text-black hover:bg-[#FFB74D]', // Orange
    secondary: 'bg-[#00CCFF] text-black hover:bg-[#4DD0E1]', // Cyan
    accent: 'bg-[#FF85C1] text-black hover:bg-[#F06292]', // Pink
    outline: 'bg-white text-black border-2 border-black hover:bg-gray-100',
    danger: 'bg-red-500 text-white hover:bg-red-600',
  };

  const sizes = {
    sm: 'px-3 py-1 text-sm rounded-lg',
    md: 'px-6 py-3 text-base rounded-xl',
    lg: 'px-8 py-4 text-xl rounded-2xl font-black uppercase tracking-wider',
    icon: 'p-3 rounded-full',
  };

  return (
    <motion.button
      whileHover={{ scale: 1.05, rotate: -2 }}
      whileTap={{ scale: 0.95, rotate: 0 }}
      className={cn(
        "relative border-[3px] border-black shadow-[4px_4px_0px_0px_#000] font-serif font-bold transition-colors select-none",
        variants[variant],
        sizes[size],
        disabled && "opacity-50 cursor-not-allowed grayscale",
        className
      )}
      onClick={disabled ? undefined : onClick}
    >
      {children}
    </motion.button>
  );
};

// 2. Comic Panel (Card)
const ComicPanel = ({ children, className, rotate = 0 }: { children: React.ReactNode; className?: string; rotate?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className={cn(
      "bg-white border-[3px] border-black shadow-[6px_6px_0px_0px_#000] rounded-xl overflow-hidden relative",
      className
    )}
    style={{ rotate: rotate }}
  >
    {children}
  </motion.div>
);

// 3. Screen Container (Phone Wrapper for Desktop)
const ScreenContainer = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen w-full flex justify-center bg-[#202020] overflow-hidden relative">
    {/* Desktop Background Pattern */}
    <div className="absolute inset-0 z-0 opacity-20 pointer-events-none" 
         style={{ 
           backgroundImage: 'radial-gradient(#FF9E00 2px, transparent 2px)', 
           backgroundSize: '30px 30px' 
         }} 
    />
    
    {/* Phone Frame */}
    <div className="w-full max-w-[480px] min-h-screen bg-[#FF9E00] relative shadow-2xl overflow-y-auto overflow-x-hidden font-sans">
      {/* Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none z-50 opacity-[0.08] mix-blend-multiply" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")` }} 
      />
      {children}
    </div>
  </div>
);

// 4. Header with Wavy Divider
const ComicHeader = ({ title, leftAction }: { title: string; leftAction?: React.ReactNode }) => (
  <div className="relative z-10">
    <div className="bg-[#FFD600] border-b-[3px] border-black p-4 pt-6 pb-8 relative">
      <div className="flex items-center justify-between">
        {leftAction || <div className="w-10" />}
        <h1 className="font-serif text-3xl md:text-4xl text-black text-center uppercase tracking-tighter drop-shadow-sm transform -rotate-1">
          {title}
        </h1>
        <div className="w-10" />
      </div>
      
      {/* Halftone Pattern Decoration */}
      <div className="absolute top-2 right-2 opacity-20">
         <div className="w-16 h-16 bg-[radial-gradient(circle,_#000_1px,_transparent_1px)] [background-size:4px_4px]" />
      </div>
    </div>
    
    {/* SVG Wave */}
    <div className="absolute bottom-[-14px] left-0 w-full overflow-hidden leading-[0]">
        <svg viewBox="0 0 1200 120" preserveAspectRatio="none" className="relative block w-[calc(100%+1.3px)] h-[15px] rotate-180">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="fill-[#FFD600] stroke-black stroke-[3px]"></path>
        </svg>
    </div>
  </div>
);

// --- Pages ---

// Welcome Screen
const WelcomeScreen = () => {
  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0 }} 
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center min-h-screen p-6 relative bg-[#FF9E00]"
    >
      {/* Background Burst */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
         <motion.div 
           animate={{ rotate: 360 }}
           transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
           className="w-[800px] h-[800px] bg-[conic-gradient(from_0deg_at_50%_50%,_#FFD600_0deg,_#FFD600_15deg,_transparent_15deg,_transparent_30deg)] rounded-full opacity-50"
         />
      </div>

      <motion.div 
        initial={{ scale: 0.8, y: 50 }}
        animate={{ scale: 1, y: 0 }}
        className="z-10 flex flex-col items-center w-full max-w-sm"
      >
        <div className="bg-white border-[4px] border-black p-6 rounded-[2rem] shadow-[8px_8px_0px_0px_#000] rotate-2 mb-12 w-full text-center relative">
          <div className="absolute -top-6 -right-6">
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }} 
              transition={{ repeat: Infinity, duration: 2 }}
              className="bg-[#FF0055] text-white font-bold p-3 rounded-full border-[3px] border-black shadow-[3px_3px_0px_0px_#000]"
            >
              <Sparkles size={24} />
            </motion.div>
          </div>
          <h1 className="font-serif text-5xl md:text-6xl text-black leading-[0.9] mb-2 drop-shadow-md">
            PON<br/>PON<br/><span className="text-[#00CCFF] stroke-black stroke-2">MANIA</span>
          </h1>
          <p className="font-sans font-bold text-lg mt-4 border-t-2 border-black pt-2">
            MAHJONG CALCULATOR
          </p>
        </div>

        <div className="space-y-4 w-full">
            <ComicButton 
                onClick={() => navigate('/lobby')} 
                variant="primary" 
                size="lg"
                className="w-full text-2xl"
            >
                START GAME
            </ComicButton>
            
            <ComicButton 
                onClick={() => {}} // Placeholder
                variant="outline" 
                size="md"
                className="w-full"
            >
                HOW TO PLAY
            </ComicButton>
        </div>
      </motion.div>

      {/* Footer Decoration */}
      <div className="absolute bottom-0 left-0 w-full h-12 bg-black skew-y-2 translate-y-6" />
    </motion.div>
  );
};

// Lobby Screen
const LobbyScreen = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#F0F0F0]">
      <ComicHeader 
        title="LOBBY" 
        leftAction={
          <button onClick={() => navigate('/')} className="p-2 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000]">
            <ChevronLeft size={24} />
          </button>
        } 
      />
      
      <div className="p-6 pt-10 space-y-8">
        {/* Create Game Card */}
        <ComicPanel className="bg-[#00CCFF]" rotate={-1}>
          <div className="p-6 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white border-[3px] border-black rounded-full flex items-center justify-center mb-4 shadow-[4px_4px_0px_0px_#000]">
               <Play size={32} fill="black" />
            </div>
            <h2 className="font-serif text-2xl mb-2">NEW MATCH</h2>
            <p className="font-sans font-medium mb-6">Start a fresh calculator session.</p>
            <ComicButton onClick={() => navigate('/game')} variant="outline" className="w-full font-black">
              LET'S GO!
            </ComicButton>
          </div>
        </ComicPanel>

        {/* Recent History */}
        <div>
           <h3 className="font-serif text-xl mb-4 flex items-center">
             <span className="w-8 h-8 bg-black text-white rounded-lg flex items-center justify-center mr-2 text-sm shadow-[2px_2px_0px_0px_#888]">#</span>
             RECENT LOGS
           </h3>
           <div className="space-y-4">
             {[1, 2].map((i) => (
                <ComicPanel key={i} className="bg-white p-4" rotate={i % 2 === 0 ? 1 : -1}>
                  <div className="flex justify-between items-center">
                     <div>
                       <div className="font-serif font-bold text-lg">MATCH #{100+i}</div>
                       <div className="text-sm text-gray-500 font-sans font-bold">Yesterday, 14:20</div>
                     </div>
                     <div className="px-3 py-1 bg-[#FFD600] border-2 border-black rounded-lg font-bold text-sm">
                        WINNER: P{i}
                     </div>
                  </div>
                </ComicPanel>
             ))}
           </div>
        </div>
      </div>
    </div>
  );
};

// Game Screen
const GameScreen = () => {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<Player[]>(
    WINDS.map((wind, i) => ({
      id: i,
      name: `Player ${i + 1}`,
      score: 25000,
      wind,
      avatarColor: PLAYER_COLORS[i],
    }))
  );
  
  const [history, setHistory] = useState<HandRecord[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentRound, setCurrentRound] = useState('East 1');

  // Modal State
  const [winnerId, setWinnerId] = useState<number>(0);
  const [loserId, setLoserId] = useState<number | null>(null); // null for Tsumo
  const [winType, setWinType] = useState<'Ron' | 'Tsumo'>('Ron');
  const [han, setHan] = useState(1);
  const [fu, setFu] = useState(30);

  const handleRecordHand = () => {
    // Basic scoring math
    const isDealer = players[winnerId].wind === 'East';
    const points = calculatePoints(han, fu, isDealer, winType);
    
    // Create Record
    const newRecord: HandRecord = {
      id: Date.now().toString(),
      round: currentRound,
      winnerId,
      loserId: winType === 'Ron' ? loserId : null,
      type: winType,
      han,
      fu,
      points,
      timestamp: Date.now(),
    };

    setHistory([newRecord, ...history]);

    // Update Scores
    const newPlayers = [...players];
    
    if (winType === 'Ron' && loserId !== null) {
        // Direct hit
        newPlayers[winnerId].score += points;
        newPlayers[loserId].score -= points;
    } else {
        // Tsumo (Split payment)
        // Simplified: Winner gets total, others split evenly (roughly)
        newPlayers[winnerId].score += points;
        const paymentPerPerson = Math.ceil(points / 3 / 100) * 100; // rough approximation
        newPlayers.forEach((p, idx) => {
            if (idx !== winnerId) {
                p.score -= paymentPerPerson;
            }
        });
    }

    setPlayers(newPlayers);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#F0F0F0] pb-24">
      <ComicHeader 
        title="TABLE" 
        leftAction={
          <button onClick={() => navigate('/lobby')} className="p-2 bg-white border-2 border-black rounded-lg shadow-[2px_2px_0px_0px_#000]">
            <ChevronLeft size={24} />
          </button>
        } 
      />

      {/* Scoreboard Masonry */}
      <div className="p-4 grid grid-cols-2 gap-4">
        {players.map((player) => (
          <ComicPanel 
            key={player.id} 
            className="p-3 flex flex-col items-center justify-between min-h-[140px]"
            rotate={player.id % 2 === 0 ? -1 : 1}
          >
             <div className="w-full flex justify-between items-start mb-2">
                <span className="font-serif text-2xl font-bold opacity-30">{player.wind[0]}</span>
                <div 
                   className="w-10 h-10 border-[3px] border-black rounded-full shadow-[2px_2px_0px_0px_#000]"
                   style={{ backgroundColor: player.avatarColor }}
                />
             </div>
             
             <div className="text-center w-full">
                <div className="font-sans font-bold text-sm truncate w-full mb-1">{player.name}</div>
                <div className="font-serif text-3xl font-black tracking-tight">{player.score}</div>
             </div>
          </ComicPanel>
        ))}
      </div>

      {/* History List */}
      <div className="px-6 py-4">
          <h3 className="font-serif text-xl mb-4 border-b-2 border-black pb-2 inline-block transform rotate-1">GAME LOG</h3>
          <div className="space-y-3">
            {history.length === 0 ? (
                <div className="text-center py-8 opacity-40 font-bold font-sans italic">
                    NO HANDS RECORDED YET...
                </div>
            ) : (
                history.map((record) => (
                    <div key={record.id} className="bg-white border-2 border-black p-3 rounded-lg shadow-sm flex justify-between items-center">
                        <div className="flex items-center gap-2">
                             <span className="bg-black text-white px-2 rounded text-xs font-bold">{record.round}</span>
                             <span className="font-bold font-sans">
                                {players[record.winnerId].name}
                                <span className="text-[#FF0055] mx-1">
                                    {record.type === 'Ron' ? 'HIT' : 'DRAW'}
                                </span>
                                {record.type === 'Ron' ? players[record.loserId!].name : 'ALL'}
                             </span>
                        </div>
                        <span className="font-serif font-bold text-lg">+{record.points}</span>
                    </div>
                ))
            )}
          </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-full max-w-[480px] flex justify-center pointer-events-none">
         <ComicButton 
            onClick={() => setIsModalOpen(true)}
            variant="accent"
            size="lg"
            className="rounded-full shadow-[6px_6px_0px_0px_#000] flex items-center gap-2 pointer-events-auto animate-bounce"
         >
            <Plus size={28} strokeWidth={3} /> RECORD HAND
         </ComicButton>
      </div>

      {/* Modal Overlay */}
      <AnimatePresence>
        {isModalOpen && (
           <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
               <motion.div 
                 initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                 className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                 onClick={() => setIsModalOpen(false)}
               />
               
               <motion.div 
                 initial={{ scale: 0.8, y: 100, rotate: 10 }}
                 animate={{ scale: 1, y: 0, rotate: 0 }}
                 exit={{ scale: 0.8, y: 100, opacity: 0 }}
                 className="bg-white border-[4px] border-black rounded-2xl w-full max-w-sm max-h-[90vh] overflow-y-auto shadow-[10px_10px_0px_0px_#FF9E00] relative z-50 p-6"
               >
                  <button 
                    onClick={() => setIsModalOpen(false)}
                    className="absolute top-4 right-4 p-1 hover:bg-gray-100 rounded-full border-2 border-transparent hover:border-black transition-all"
                  >
                    <X size={24} />
                  </button>

                  <h2 className="font-serif text-3xl mb-6 text-center underline decoration-wavy decoration-[#FF0055]">RECORD WIN</h2>

                  {/* Winner Select */}
                  <div className="mb-6">
                     <label className="font-sans font-bold text-sm mb-2 block uppercase tracking-wider">Who Won?</label>
                     <div className="grid grid-cols-4 gap-2">
                        {players.map((p) => (
                            <button
                                key={p.id}
                                onClick={() => setWinnerId(p.id)}
                                className={cn(
                                    "aspect-square rounded-xl border-2 border-black flex flex-col items-center justify-center transition-all",
                                    winnerId === p.id ? "bg-black text-white translate-y-[2px] shadow-none" : "bg-white shadow-[3px_3px_0px_0px_#000]"
                                )}
                            >
                                <span className="font-serif text-xl">{p.wind[0]}</span>
                            </button>
                        ))}
                     </div>
                  </div>

                  {/* Type Toggle */}
                  <div className="mb-6 flex bg-gray-100 p-1 rounded-xl border-2 border-black">
                     {(['Ron', 'Tsumo'] as const).map((type) => (
                         <button
                            key={type}
                            onClick={() => {
                                setWinType(type);
                                if (type === 'Tsumo') setLoserId(null);
                                else if (loserId === null) setLoserId((winnerId + 1) % 4);
                            }}
                            className={cn(
                                "flex-1 py-2 rounded-lg font-bold font-serif transition-all",
                                winType === type ? "bg-[#FFD600] border-2 border-black shadow-[2px_2px_0px_0px_#000]" : "text-gray-500"
                            )}
                         >
                            {type.toUpperCase()}
                         </button>
                     ))}
                  </div>

                  {/* Loser Select (Only for Ron) */}
                  {winType === 'Ron' && (
                      <div className="mb-6">
                        <label className="font-sans font-bold text-sm mb-2 block uppercase tracking-wider">Who Deal In?</label>
                        <div className="grid grid-cols-4 gap-2">
                            {players.map((p) => (
                                <button
                                    key={p.id}
                                    disabled={p.id === winnerId}
                                    onClick={() => setLoserId(p.id)}
                                    className={cn(
                                        "aspect-square rounded-xl border-2 border-black flex flex-col items-center justify-center transition-all",
                                        loserId === p.id ? "bg-[#FF0055] text-white translate-y-[2px] shadow-none" : "bg-white shadow-[3px_3px_0px_0px_#000]",
                                        p.id === winnerId && "opacity-20 cursor-not-allowed shadow-none border-gray-300"
                                    )}
                                >
                                    <span className="font-serif text-xl">{p.wind[0]}</span>
                                </button>
                            ))}
                        </div>
                      </div>
                  )}

                  {/* Points Input */}
                  <div className="grid grid-cols-2 gap-4 mb-8">
                      <div>
                          <label className="font-sans font-bold text-sm mb-1 block">HAN</label>
                          <input 
                             type="number" 
                             value={han} 
                             onChange={(e) => setHan(Number(e.target.value))}
                             className="w-full border-[3px] border-black rounded-xl p-3 text-center font-serif text-2xl font-bold focus:outline-none focus:ring-4 ring-[#00CCFF]/30"
                          />
                      </div>
                      <div>
                          <label className="font-sans font-bold text-sm mb-1 block">FU</label>
                          <input 
                             type="number" 
                             value={fu} 
                             onChange={(e) => setFu(Number(e.target.value))}
                             className="w-full border-[3px] border-black rounded-xl p-3 text-center font-serif text-2xl font-bold focus:outline-none focus:ring-4 ring-[#00CCFF]/30"
                          />
                      </div>
                  </div>

                  <ComicButton onClick={handleRecordHand} className="w-full" size="lg">
                     CONFIRM!
                  </ComicButton>

               </motion.div>
           </div>
        )}
      </AnimatePresence>
    </div>
  );
};

// --- App Root ---

const PonponApp = () => {
  return (
    <ScreenContainer>
        <HashRouter>
            <Routes>
                <Route path="/" element={<WelcomeScreen />} />
                <Route path="/lobby" element={<LobbyScreen />} />
                <Route path="/game" element={<GameScreen />} />
                <Route path="*" element={<WelcomeScreen />} />
            </Routes>
        </HashRouter>
    </ScreenContainer>
  );
};

export default PonponApp;

