/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Trophy, Timer, RotateCcw, Play, Info, CheckCircle2, AlertCircle } from 'lucide-react';
import confetti from 'canvas-confetti';

// --- Types ---
type GameState = 'START' | 'PLAYING' | 'GAMEOVER';

interface Color {
  h: number;
  s: number;
  l: number;
}

// --- Constants ---
const GRID_SIZE = 5;
const INITIAL_TIME = 30;
const TIME_BONUS = 2;

const COLOR_TIPS = [
  "互补色（如红与绿）在色轮上相对，搭配使用能产生最强烈的视觉对比。",
  "类似色（如蓝、蓝绿、绿）在色轮上相邻，能营造出和谐且宁静的氛围。",
  "在色彩心理学中，蓝色通常与信任和冷静联系在一起，而红色则代表能量和激情。",
  "三原色（红、黄、蓝）是所有其他颜色的基础，无法通过混合其他颜色得到。",
  "间色（橙、绿、紫）是由两种原色等量混合而成的颜色。",
  "在许多文化中，白色象征纯洁和和平，但在某些东方文化中也与哀悼有关。",
  "暖色调（红、橙、黄）具有前进感，能让空间显得更小、更温馨。",
  "冷色调（蓝、绿、紫）具有后退感，能让空间显得更开阔、更凉爽。",
  "孟塞尔颜色系统通过色相、明度和纯度三个维度来描述色彩。",
  "包豪斯学派的约翰内斯·伊顿提出了著名的色彩对比理论，深刻影响了现代设计。",
  "黑色在时尚界代表永恒的优雅，而在心理学中则可能暗示神秘或权威。",
  "黄色是可见光谱中最容易被眼睛捕捉到的颜色，常用于警告标志。",
];

// --- Utils ---
const generateColor = (): Color => ({
  h: Math.floor(Math.random() * 360),
  s: 40 + Math.floor(Math.random() * 40), // 40-80%
  l: 40 + Math.floor(Math.random() * 20), // 40-60%
});

const colorToCss = (c: Color) => `hsl(${c.h}, ${c.s}%, ${c.l}%)`;

const getModifiedColor = (c: Color, difficulty: number): Color => {
  // Difficulty starts at 1. Higher difficulty = smaller delta.
  // Delta starts at around 15% and goes down to 1-2%.
  const delta = Math.max(1, 15 - Math.log2(difficulty) * 2.5);
  const isLighter = Math.random() > 0.5;
  
  return {
    ...c,
    l: isLighter ? Math.min(95, c.l + delta) : Math.max(5, c.l - delta),
  };
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [timeLeft, setTimeLeft] = useState(INITIAL_TIME);
  const [grid, setGrid] = useState<{ color: string; isTarget: boolean }[]>([]);
  const [level, setLevel] = useState(1);
  const [lastResult, setLastResult] = useState<{ success: boolean; x: number; y: number } | null>(null);
  const [currentTip, setCurrentTip] = useState(COLOR_TIPS[0]);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const generateNewGrid = useCallback(() => {
    const baseColor = generateColor();
    const targetColor = getModifiedColor(baseColor, level);
    const targetIndex = Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE));
    
    const newGrid = Array.from({ length: GRID_SIZE * GRID_SIZE }, (_, i) => ({
      color: i === targetIndex ? colorToCss(targetColor) : colorToCss(baseColor),
      isTarget: i === targetIndex,
    }));
    
    setGrid(newGrid);
  }, [level]);

  const startGame = () => {
    setScore(0);
    setLevel(1);
    setTimeLeft(INITIAL_TIME);
    setGameState('PLAYING');
    setLastResult(null);
    generateNewGrid();
  };

  const [isShaking, setIsShaking] = useState(false);

  const handleBlockClick = (isTarget: boolean, index: number) => {
    if (gameState !== 'PLAYING') return;

    if (isTarget) {
      setScore(s => s + 1);
      setLevel(l => l + 1);
      setTimeLeft(t => Math.min(INITIAL_TIME, t + TIME_BONUS));
      generateNewGrid();
      
      if ((score + 1) % 10 === 0) {
        confetti({
          particleCount: 50,
          spread: 70,
          origin: { y: 0.6 }
        });
      }
    } else {
      // Penalty for wrong click
      setTimeLeft(t => Math.max(0, t - 5));
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  };

  useEffect(() => {
    if (gameState === 'PLAYING') {
      timerRef.current = setInterval(() => {
        setTimeLeft(t => {
          if (t <= 0) {
            setGameState('GAMEOVER');
            return 0;
          }
          return t - 0.1;
        });
      }, 100);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'START' || gameState === 'GAMEOVER') {
      const randomTip = COLOR_TIPS[Math.floor(Math.random() * COLOR_TIPS.length)];
      setCurrentTip(randomTip);
    }
  }, [gameState]);

  const getRank = (s: number) => {
    if (s < 10) return { title: "色彩小白", desc: "还需要多多观察生活中的色彩哦！" };
    if (s < 20) return { title: "美术新生", desc: "已经具备了基本的色彩辨识能力。" };
    if (s < 35) return { title: "色调达人", desc: "你的眼睛对微小色差非常敏感！" };
    if (s < 50) return { title: "视觉大师", desc: "艺术天赋拉满，色彩是你的语言。" };
    return { title: "神之眼", desc: "你确定你不是一台精密的色度计吗？" };
  };

  return (
    <div className="min-h-screen bg-[#F5F2ED] text-[#1A1A1A] font-sans selection:bg-emerald-100 p-4 md:p-8 flex flex-col items-center justify-center">
      {/* Header */}
      <header className="w-full max-w-md mb-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-400 via-emerald-400 to-indigo-400 animate-pulse" />
          <h1 className="text-2xl font-bold tracking-tight">Chroma Vision</h1>
        </div>
        {gameState === 'PLAYING' && (
          <div className="flex items-center gap-4">
            <div className="flex flex-col items-end">
              <span className="text-[10px] uppercase tracking-widest opacity-50 font-semibold">Score</span>
              <span className="text-xl font-mono font-bold leading-none">{score}</span>
            </div>
          </div>
        )}
      </header>

      <main className="w-full max-w-md relative">
        <AnimatePresence mode="wait">
          {gameState === 'START' && (
            <motion.div
              key="start"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[32px] p-8 shadow-xl shadow-black/5 border border-black/5 text-center"
            >
              <div className="mb-6 inline-flex p-4 bg-emerald-50 rounded-2xl text-emerald-600">
                <Info size={32} />
              </div>
              <h2 className="text-3xl font-serif font-medium mb-4 italic">寻找那一抹不同</h2>
              <p className="text-gray-500 mb-8 leading-relaxed">
                在 5x5 的色块矩阵中，有一个色块的亮度略有不同。
                随着关卡提升，差异会越来越小。
                你有 30 秒时间，每答对一题奖励 2 秒。
              </p>
              <button
                onClick={startGame}
                className="w-full py-4 bg-[#1A1A1A] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-black transition-colors group"
              >
                <Play size={20} className="group-hover:scale-110 transition-transform" />
                开始挑战
              </button>

              <div className="mt-8 pt-6 border-t border-black/5">
                <div className="flex items-center justify-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-500 mb-2">
                  <Info size={12} />
                  <span>色彩贴士</span>
                </div>
                <p className="text-xs text-gray-400 italic leading-relaxed px-4">
                  "{currentTip}"
                </p>
              </div>
            </motion.div>
          )}

          {gameState === 'PLAYING' && (
            <motion.div
              key="playing"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="space-y-6"
            >
              {/* Timer Bar */}
              <div className="w-full h-2 bg-black/5 rounded-full overflow-hidden">
                <motion.div
                  className="h-full bg-emerald-500"
                  initial={{ width: '100%' }}
                  animate={{ width: `${(timeLeft / INITIAL_TIME) * 100}%` }}
                  transition={{ duration: 0.1, ease: 'linear' }}
                />
              </div>

              {/* Grid */}
              <motion.div 
                animate={isShaking ? { x: [-10, 10, -10, 10, 0] } : {}}
                transition={{ duration: 0.4 }}
                className="grid grid-cols-5 gap-2 aspect-square w-full"
              >
                {grid.map((block, i) => (
                  <motion.button
                    key={`${level}-${i}`}
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: i * 0.01 }}
                    whileHover={{ scale: 0.98 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => handleBlockClick(block.isTarget, i)}
                    className="w-full h-full rounded-lg shadow-sm"
                    style={{ backgroundColor: block.color }}
                  />
                ))}
              </motion.div>

              <div className="flex justify-between items-center text-sm text-gray-400 font-mono">
                <div className="flex items-center gap-1">
                  <Timer size={14} />
                  <span>{timeLeft.toFixed(1)}s</span>
                </div>
                <div className="flex items-center gap-1">
                  <Trophy size={14} />
                  <span>LV.{level}</span>
                </div>
              </div>
            </motion.div>
          )}

          {gameState === 'GAMEOVER' && (
            <motion.div
              key="gameover"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white rounded-[32px] p-8 shadow-xl shadow-black/5 border border-black/5 text-center"
            >
              <div className="mb-4 text-rose-500 flex justify-center">
                <AlertCircle size={48} />
              </div>
              <h2 className="text-2xl font-bold mb-2">挑战结束</h2>
              <div className="text-5xl font-mono font-bold mb-6">{score}</div>
              
              <div className="bg-[#F5F2ED] rounded-2xl p-6 mb-8 text-left">
                <div className="flex items-center gap-2 mb-2 text-emerald-600">
                  <CheckCircle2 size={18} />
                  <span className="font-bold">{getRank(score).title}</span>
                </div>
                <p className="text-sm text-gray-600 mb-4">{getRank(score).desc}</p>
                
                <div className="pt-4 border-t border-black/5">
                  <div className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-gray-400 mb-1">
                    <Info size={10} />
                    <span>色彩知识</span>
                  </div>
                  <p className="text-xs text-gray-500 italic">
                    {currentTip}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={startGame}
                  className="py-4 bg-[#1A1A1A] text-white rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-black transition-colors"
                >
                  <RotateCcw size={18} />
                  再来一次
                </button>
                <button
                  onClick={() => setGameState('START')}
                  className="py-4 border border-black/10 rounded-2xl font-semibold flex items-center justify-center gap-2 hover:bg-black/5 transition-colors"
                >
                  返回主页
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer Info */}
      <footer className="mt-12 w-full max-w-md">
        <div className="border-t border-black/5 pt-6 flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-black/5 flex items-center justify-center text-emerald-500">
              <Info size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">色彩原理</h4>
              <p className="text-xs text-gray-500">本游戏基于 HSL 色彩空间，通过微调 L (亮度) 来产生视觉差异。</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-white border border-black/5 flex items-center justify-center text-rose-500">
              <AlertCircle size={16} />
            </div>
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-gray-400">视觉疲劳</h4>
              <p className="text-xs text-gray-500">长时间盯着屏幕可能导致视觉疲劳，建议每玩 10 分钟休息一下。</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
