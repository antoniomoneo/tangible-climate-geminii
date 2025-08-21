import React, { useState, useEffect, useRef } from 'react';
import type { Language, ChatMessage } from '../types';
import { locales } from '../locales';
import { AuraIcon, UserIcon } from './icons';

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
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };
  
  useEffect(scrollToBottom, [messages]);

  useEffect(() => {
    if (isOpen) {
      setMessages([]);
      setInput('');
      setError(null);
      setIsSending(false);
    }
  }, [isOpen]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isSending) return;

    const userMessage: ChatMessage = { role: 'user', content: input };
    const currentHistory = [...messages, userMessage];
    setMessages(prev => [...prev, userMessage, { role: 'model', content: '' }]);
    setInput('');
    setIsSending(true);
    setError(null);
    
    try {
      const response = await fetch('/api/gemini', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          messages: currentHistory,
          context: context,
          systemInstruction: t.chatSystemInstruction,
         }),
      });

      if (!response.ok) {
        // More robust error handling: read the body once and try to parse it.
        const errorText = await response.text(); // Read the body as text ONCE.
        let serverError;
        try {
          // Try to parse the text as JSON.
          const errorJson = JSON.parse(errorText);
          serverError = errorJson.error || errorText; // Use the parsed error, or fall back to the full text.
        } catch (e) {
          // If parsing fails, the error is the raw text itself.
          serverError = errorText;
        }
        // Throw an error with the specific message, or a generic one if the body was empty.
        throw new Error(serverError || `HTTP error! status: ${response.status}`);
      }
      
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Failed to get response reader');
      }

      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n\n').filter(line => line.trim() !== '');
        
        for (const line of lines) {
            if (line.startsWith('data: ')) {
                try {
                    const json = JSON.parse(line.substring(6));
                    if (json.text) {
                         setMessages(prev => {
                            const lastMessage = prev[prev.length - 1];
                            if (lastMessage?.role === 'model') {
                              const updatedMessages = [...prev];
                              updatedMessages[updatedMessages.length - 1] = {
                                ...lastMessage,
                                content: lastMessage.content + json.text,
                              };
                              return updatedMessages;
                            }
                            return prev;
                          });
                    }
                } catch (e) {
                    console.error('Failed to parse stream chunk:', line);
                }
            }
        }
      }
    } catch (e: any) {
        console.error('Chat error:', e);
        const errorMessage = e.message || t.chatNotConfigured;
        setError(errorMessage);
        setMessages(prev => {
           const newMessages = [...prev];
           const lastMessage = newMessages[newMessages.length - 1];
           if (lastMessage && lastMessage.role === 'model' && lastMessage.content === '') {
              lastMessage.content = errorMessage;
           }
           return newMessages;
        });
    } finally {
        setIsSending(false);
    }
  };
  
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-gray-800 border border-gray-700 rounded-xl shadow-2xl w-full max-w-2xl h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-600 flex-shrink-0">
          <h2 className="font-title text-2xl text-cyan-400 flex items-center gap-3">
            <AuraIcon className="h-6 w-6" />
            {t.chatTitle}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white text-3xl leading-none">&times;</button>
        </div>

        {/* Content */}
        <div className="flex-grow p-4 overflow-y-auto space-y-4">
            {messages.map((msg, index) => (
              <div key={index} className={`flex items-start gap-3 my-2 ${msg.role === 'user' ? 'justify-end' : ''}`}>
                {msg.role === 'model' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-cyan-500 flex items-center justify-center">
                    <AuraIcon className="h-5 w-5 text-white" />
                  </div>
                )}
                <div className={`max-w-md p-3 rounded-lg shadow ${msg.role === 'user' ? 'bg-gray-700' : 'bg-gray-700'}`}>
                   {msg.content === '' && msg.role === 'model' && isSending ? (
                      <div className="flex items-center space-x-1 p-2">
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.3s]"></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse [animation-delay:-0.15s]"></span>
                          <span className="w-2 h-2 bg-gray-400 rounded-full animate-pulse"></span>
                      </div>
                    ) : (
                      <p className="text-white whitespace-pre-wrap">{msg.content}</p>
                    )}
                </div>
                 {msg.role === 'user' && (
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center">
                    <UserIcon />
                  </div>
                )}
              </div>
            ))}
             <div ref={messagesEndRef} />
        </div>
        
        <div className="p-4 border-t border-gray-600 flex-shrink-0">
            {error && !isSending && <p className="text-red-400 text-sm mb-2 text-center">{error}</p>}
            <form onSubmit={handleSendMessage} className="flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={t.chatPlaceholder}
                    disabled={isSending}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 disabled:opacity-50"
                    aria-label={t.chatPlaceholder}
                />
                <button
                    type="submit"
                    disabled={isSending || !input.trim()}
                    className="bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors disabled:bg-gray-600 disabled:cursor-not-allowed"
                >
                    {t.chatSend}
                </button>
            </form>
        </div>
      </div>
    </div>
  );
};

export default ChatModal;