import React, { useState, useRef, useEffect } from 'react';
import type { Language, ChatMessage } from '../types';
import { locales } from '../locales';
import { sendMessageToAura } from '../services/geminiService';
import { AuraIcon } from './icons';

interface ChatModalProps {
  isOpen: boolean;
  onClose: () => void;
  language: Language;
  context: string;
}

const ChatModal: React.FC<ChatModalProps> = ({ isOpen, onClose, language, context }) => {
  const t = locales[language];
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(scrollToBottom, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      const auraResponse = await sendMessageToAura(input, context, language);
      const auraMessage: ChatMessage = { role: 'aura', content: auraResponse };
      setMessages(prev => [...prev, auraMessage]);
    } catch (error) {
      const errorMessage: ChatMessage = { role: 'aura', content: "Sorry, an error occurred." };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600">
          <h2 className="font-title text-2xl text-cyan-400 flex items-center gap-3">
            <AuraIcon className="h-6 w-6" />
            {t.chatTitle}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">&times;</button>
        </div>

        {/* Messages */}
        <div className="flex-grow p-4 overflow-y-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 my-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.role === 'aura' && <div className="bg-cyan-600 p-2 rounded-full"><AuraIcon className="h-5 w-5 text-white" /></div>}
              <div className={`max-w-md p-3 rounded-lg ${msg.role === 'user' ? 'bg-gray-700' : 'bg-gray-900'}`}>
                <p className="text-gray-200">{msg.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex items-start gap-3 my-4 justify-start">
               <div className="bg-cyan-600 p-2 rounded-full"><AuraIcon className="h-5 w-5 text-white" /></div>
               <div className="max-w-md p-3 rounded-lg bg-gray-900">
                  <div className="flex items-center gap-2">
                    <span className="h-2 w-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-cyan-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-cyan-400 rounded-full animate-bounce"></span>
                  </div>
               </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="p-4 border-t border-gray-600">
          <form onSubmit={handleSend} className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.chatPlaceholder}
              className="flex-grow bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
              disabled={isLoading}
            />
            <button type="submit" disabled={isLoading || !input.trim()} className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed">
              {t.chatSend}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;
