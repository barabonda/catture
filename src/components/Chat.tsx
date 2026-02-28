import { useState, useRef, useEffect, useCallback } from 'react';
import { ChatMessage } from '../types';
import { generateChatResponseStream } from '../services/gemini';
import { SpeechBubble } from './SpeechBubble';
import { Camera, Bell, RotateCcw, ChevronLeft, ChevronRight, Image } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { CameraView } from './CameraView';
import { JourneyReview } from './JourneyReview';

const STORAGE_KEY = 'catture_messages';

const BubbleOverlay = () => (
  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 100 100">
    <circle cx="50" cy="50" r="49" fill="none" stroke="rgba(255,255,255,0.6)" strokeWidth="2" />
    <circle cx="50" cy="50" r="48" fill="none" stroke="rgba(255,255,255,0.3)" strokeWidth="4" filter="blur(2px)" />
    <path d="M 25 25 Q 50 10 75 25" fill="none" stroke="rgba(255,255,255,0.9)" strokeWidth="4" strokeLinecap="round" filter="blur(1px)" />
    <circle cx="30" cy="25" r="3" fill="rgba(255,255,255,1)" filter="blur(0.5px)" />
    <path d="M 30 80 Q 50 90 70 80" fill="none" stroke="rgba(255,255,255,0.5)" strokeWidth="3" strokeLinecap="round" filter="blur(2px)" />
  </svg>
);

const bubblePositions = [
  { top: '10%', left: '2%' },
  { top: '15%', right: '2%' },
  { top: '45%', left: '-2%' },
  { top: '42%', right: '-2%' },
  { bottom: '15%', left: '8%' },
  { bottom: '20%', right: '8%' },
];

const bubbleSizes = ['w-20 h-20', 'w-16 h-16', 'w-14 h-14', 'w-16 h-16', 'w-24 h-24', 'w-14 h-14'];

const INITIAL_MESSAGE: ChatMessage = {
  id: '1',
  role: 'model',
  text: '안녕! 오늘 하루는 어땠어?\n조금 지치거나 힘들다면 편하게 사진으로 이야기해줘.\n지금 눈앞에 보이는 걸 찍어볼까?',
  timestamp: new Date().toISOString(),
};

export function Chat() {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        return [INITIAL_MESSAGE];
      }
    }
    return [INITIAL_MESSAGE];
  });

  const [streamingText, setStreamingText] = useState('');
  const [visibleText, setVisibleText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isThinking, setIsThinking] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [currentBubbleIndex, setCurrentBubbleIndex] = useState(-1);
  const abortRef = useRef(false);
  const typewriterRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const modelMessages = messages.filter(m => m.role === 'model' && m.text);
  const userPhotos = messages.filter(m => m.role === 'user' && m.imageUrl);

  const displayedModelIndex = currentBubbleIndex === -1
    ? modelMessages.length - 1
    : currentBubbleIndex;

  // Typewriter: progressively reveal streamingText into visibleText
  useEffect(() => {
    if (!isStreaming && !isThinking) {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
      return;
    }

    if (typewriterRef.current) clearInterval(typewriterRef.current);

    const target = streamingText;
    typewriterRef.current = setInterval(() => {
      setVisibleText(prev => {
        if (prev.length >= target.length) {
          if (typewriterRef.current) {
            clearInterval(typewriterRef.current);
            typewriterRef.current = null;
          }
          return prev;
        }
        const charsToAdd = Math.min(2, target.length - prev.length);
        return target.slice(0, prev.length + charsToAdd);
      });
    }, 40);

    return () => {
      if (typewriterRef.current) {
        clearInterval(typewriterRef.current);
        typewriterRef.current = null;
      }
    };
  }, [streamingText, isStreaming, isThinking]);

  const displayedText = isStreaming || isThinking
    ? visibleText
    : modelMessages[displayedModelIndex]?.text || '';

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
  }, [messages]);

  useEffect(() => {
    setCurrentBubbleIndex(-1);
  }, [messages.length]);

  const streamResponse = useCallback(async (
    history: ChatMessage[],
    newMessage?: string,
    base64Image?: string,
    mimeType?: string
  ) => {
    setIsThinking(true);
    setIsStreaming(false);
    setStreamingText('');
    setVisibleText('');
    setCurrentBubbleIndex(-1);
    abortRef.current = false;

    let fullText = '';
    let firstChunk = true;

    try {
      const stream = generateChatResponseStream(history, newMessage, base64Image, mimeType);

      for await (const chunk of stream) {
        if (abortRef.current) break;

        if (firstChunk) {
          setIsThinking(false);
          setIsStreaming(true);
          firstChunk = false;
        }

        fullText += chunk;
        setStreamingText(fullText);
      }

      if (!fullText) {
        fullText = '미안해, 지금은 대답하기가 조금 힘드네. 조금 이따가 다시 얘기할까?';
      }

      const newModelMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: fullText,
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, newModelMsg]);
    } catch (error) {
      console.error('Stream error:', error);
      const errorMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: '앗, 뭔가 문제가 생겼어. 조금 이따가 다시 시도해볼까?',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMsg]);
    } finally {
      if (typewriterRef.current) clearInterval(typewriterRef.current);
      setIsStreaming(false);
      setIsThinking(false);
      setStreamingText('');
      setVisibleText('');
    }
  }, []);

  const handleCapture = async (dataUrl: string) => {
    setIsCameraOpen(false);

    const mimeType = dataUrl.split(';')[0].split(':')[1];
    const base64Data = dataUrl.split(',')[1];

    const newUserMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      imageUrl: dataUrl,
      base64Data,
      mimeType,
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, newUserMsg];
    setMessages(updatedMessages);

    await streamResponse(updatedMessages, undefined, base64Data, mimeType);
  };

  const handleAlarm = async () => {
    if (isStreaming || isThinking) return;
    const alarmText = "[알람] 시간이 꽤 지났네요. 유저가 잘 쉬고 있는지, 혹은 아주 작은 퀘스트(Lv.1)를 하나 제안해볼까요?";
    await streamResponse(messages, alarmText);
  };

  const resetSession = () => {
    if (window.confirm('오늘의 대화를 마치고 새로운 여정을 시작할까요?')) {
      const newInitial: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: '새로운 시작이야! 오늘도 너의 속도대로 천천히 걸어가보자.\n지금 기분은 어때? 사진으로 보여줄래?',
        timestamp: new Date().toISOString(),
      };
      setMessages([newInitial]);
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const navigateBubble = (direction: 'prev' | 'next') => {
    if (isStreaming || isThinking) return;
    setCurrentBubbleIndex(prev => {
      const current = prev === -1 ? modelMessages.length - 1 : prev;
      if (direction === 'prev') return Math.max(0, current - 1);
      if (direction === 'next') {
        const next = current + 1;
        return next >= modelMessages.length - 1 ? -1 : next;
      }
      return prev;
    });
  };

  const isLoading = isStreaming || isThinking;
  const canGoPrev = displayedModelIndex > 0 && !isLoading;
  const canGoNext = currentBubbleIndex !== -1 && !isLoading;

  return (
    <div className="flex flex-col h-full relative overflow-hidden">
      <AnimatePresence>
        {isCameraOpen && (
          <CameraView
            onCapture={handleCapture}
            onClose={() => setIsCameraOpen(false)}
          />
        )}
        {isReviewOpen && (
          <JourneyReview
            messages={messages}
            onClose={() => setIsReviewOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Top bar */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2 z-10">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold text-slate-700">catture!</h1>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={handleAlarm}
            className="p-2 text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 rounded-full transition-colors"
            title="알람"
          >
            <Bell size={18} />
          </button>
          <button
            onClick={resetSession}
            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
            title="초기화"
          >
            <RotateCcw size={18} />
          </button>
        </div>
      </div>

      {/* Main avatar area */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 gap-2 min-h-0 relative z-0">
        
        {/* Floating Memory Bubbles */}
        <AnimatePresence>
          {userPhotos.slice(-6).map((photo, i) => {
            const pos = bubblePositions[i % bubblePositions.length];
            const sizeClass = bubbleSizes[i % bubbleSizes.length];
            return (
              <motion.div
                key={photo.id}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1, y: [0, -10, 0], x: [0, 5, 0] }}
                exit={{ opacity: 0, scale: 0 }}
                transition={{ 
                  opacity: { duration: 0.5 },
                  scale: { type: "spring", bounce: 0.5 },
                  y: { repeat: Infinity, duration: 4 + (i % 3), ease: "easeInOut", delay: i * 0.5 },
                  x: { repeat: Infinity, duration: 5 + (i % 2), ease: "easeInOut", delay: i * 0.3 }
                }}
                className={`absolute -z-10 ${sizeClass}`}
                style={pos}
              >
                <div className="relative w-full h-full rounded-full p-[2px] bg-white/20 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.1)] border border-white/40">
                  <div className="w-full h-full rounded-full overflow-hidden relative bg-slate-100">
                    <img src={photo.imageUrl} alt="Memory" className="w-full h-full object-cover opacity-90" />
                    <BubbleOverlay />
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>

        {/* Speech bubble */}
        <div className="w-full max-w-sm z-20">
          <SpeechBubble
            text={displayedText}
            isStreaming={isStreaming}
            isThinking={isThinking}
          />
        </div>

        {/* Cat avatar */}
        <motion.div
          className={`relative z-10 ${isLoading ? 'animate-float' : 'animate-breathe'}`}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 200, damping: 18, delay: 0.2 }}
        >
          <img
            src="/cat_character.png"
            alt="고양이 동반자"
            className="w-44 h-44 object-contain drop-shadow-lg"
          />
          {isLoading && (
            <>
              <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-300 rounded-full animate-sparkle" style={{ animationDelay: '0s' }} />
              <span className="absolute top-4 -left-2 w-2 h-2 bg-pink-300 rounded-full animate-sparkle" style={{ animationDelay: '0.7s' }} />
              <span className="absolute -top-2 left-6 w-2.5 h-2.5 bg-blue-300 rounded-full animate-sparkle" style={{ animationDelay: '1.3s' }} />
            </>
          )}
        </motion.div>

        {/* Bubble navigation */}
        {modelMessages.length > 1 && (
          <div className="flex items-center gap-3 mt-1 z-20">
            <button
              onClick={() => navigateBubble('prev')}
              disabled={!canGoPrev}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all disabled:opacity-30 disabled:cursor-default"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-xs text-slate-400 font-medium tabular-nums">
              {displayedModelIndex + 1} / {modelMessages.length}
            </span>
            <button
              onClick={() => navigateBubble('next')}
              disabled={!canGoNext}
              className="p-1.5 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/60 transition-all disabled:opacity-30 disabled:cursor-default"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>

      {/* Bottom actions */}
      <div className="px-5 pb-6 pt-2 flex flex-col gap-2 z-10">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => setIsCameraOpen(true)}
          disabled={isLoading}
          className="w-full py-4 bg-emerald-500 text-white rounded-2xl font-bold shadow-lg shadow-emerald-200/50 hover:bg-emerald-600 transition-all flex items-center justify-center gap-3 disabled:opacity-50 disabled:grayscale"
        >
          <Camera size={22} />
          사진 찍어서 대답하기
        </motion.button>

        <button
          onClick={() => setIsReviewOpen(true)}
          className="w-full py-2.5 text-slate-400 text-sm font-medium hover:text-emerald-600 transition-colors flex items-center justify-center gap-2"
        >
          <Image size={16} />
          오늘의 여정 돌아보기
        </button>
      </div>
    </div>
  );
}
