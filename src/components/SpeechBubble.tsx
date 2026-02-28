import { motion } from 'motion/react';

interface SpeechBubbleProps {
  text: string;
  isStreaming: boolean;
  isThinking: boolean;
}

export function SpeechBubble({ text, isStreaming, isThinking }: SpeechBubbleProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
      className="relative w-full max-w-sm mx-auto"
    >
      <div className="relative bg-white rounded-3xl px-6 py-5 shadow-[0_4px_32px_rgba(0,0,0,0.08)] border border-slate-100/80 min-h-[60px]">
        {isThinking && !text ? (
          <div className="flex items-center justify-center gap-2 py-1">
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
            <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
          </div>
        ) : (
          <p className="whitespace-pre-wrap leading-relaxed text-[15px] text-slate-700 text-center">
            {text}
            {isStreaming && (
              <span className="inline-block w-[3px] h-[1.1em] bg-emerald-400 ml-0.5 align-middle animate-pulse rounded-full" />
            )}
          </p>
        )}
      </div>

      {/* Bubble tail pointing down to the cat */}
      <div className="flex justify-center">
        <svg width="24" height="14" viewBox="0 0 24 14" fill="none" className="-mt-[1px]">
          <path d="M1 0H23L13.5 11.5C12.7 12.7 11.3 12.7 10.5 11.5L1 0Z" fill="white" />
          <path
            d="M0.5 0L10.2 11.5C11.1 12.8 12.9 12.8 13.8 11.5L23.5 0"
            stroke="#e2e8f0"
            strokeWidth="0.6"
            fill="none"
          />
        </svg>
      </div>
    </motion.div>
  );
}
