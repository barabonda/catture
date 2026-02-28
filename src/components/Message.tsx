import React from 'react';
import { ChatMessage } from '../types';
import { motion } from 'motion/react';
import { User } from 'lucide-react';

interface MessageProps {
  key?: React.Key;
  message: ChatMessage;
}

const BubbleTailLeft = () => (
  <svg
    className="absolute -left-[10px] bottom-[6px] w-[14px] h-[18px]"
    viewBox="0 0 14 18"
    fill="none"
  >
    <path
      d="M14 0C14 0 12 6 6 10C2 13 0 18 0 18C0 18 2 14 4 12C6 10 14 4 14 0Z"
      fill="white"
    />
    <path
      d="M14 0C14 0 12 6 6 10C2 13 0 18 0 18"
      stroke="#e2e8f0"
      strokeWidth="0.8"
      fill="none"
    />
  </svg>
);

const BubbleTailRight = () => (
  <svg
    className="absolute -right-[10px] bottom-[6px] w-[14px] h-[18px]"
    viewBox="0 0 14 18"
    fill="none"
  >
    <path
      d="M0 0C0 0 2 6 8 10C12 13 14 18 14 18C14 18 12 14 10 12C8 10 0 4 0 0Z"
      fill="#dcfce7"
    />
  </svg>
);

export function Message({ message }: MessageProps) {
  const isModel = message.role === 'model';

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex w-full ${isModel ? 'justify-start' : 'justify-end'} mb-4`}
    >
      <div className={`flex max-w-[80%] items-end ${isModel ? 'flex-row' : 'flex-row-reverse'}`}>
        <div className={`flex-shrink-0 flex items-end ${isModel ? 'mr-1' : 'ml-2'}`}>
          {isModel ? (
            <img src="/cat_character.png" alt="Cat" className="w-14 h-14 object-contain drop-shadow-sm" />
          ) : (
            <div className="h-8 w-8 rounded-full flex items-center justify-center bg-emerald-50 text-emerald-600 border border-emerald-100">
              <User size={16} />
            </div>
          )}
        </div>

        <div className={`flex flex-col ${isModel ? 'items-start' : 'items-end'}`}>
          <div className="relative">
            {isModel && <BubbleTailLeft />}
            {!isModel && <BubbleTailRight />}

            <div
              className={`px-4 py-3 relative z-0 ${
                isModel
                  ? 'bg-white border border-slate-200/80 text-slate-800 shadow-[0_1px_6px_rgba(0,0,0,0.04)] rounded-[20px] rounded-bl-[4px]'
                  : 'bg-green-100 text-slate-800 shadow-[0_1px_6px_rgba(0,0,0,0.04)] rounded-[20px] rounded-br-[4px]'
              }`}
            >
              {message.imageUrl && (
                <img
                  src={message.imageUrl}
                  alt="Uploaded"
                  className="max-w-full h-auto rounded-xl mb-2 object-cover max-h-48"
                  referrerPolicy="no-referrer"
                />
              )}
              {message.text && (
                <p className="whitespace-pre-wrap leading-relaxed text-[14.5px]">{message.text}</p>
              )}
            </div>
          </div>
          <span className="text-[10px] text-slate-400 mt-1.5 px-2">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>
      </div>
    </motion.div>
  );
}
