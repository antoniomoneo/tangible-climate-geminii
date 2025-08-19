import React from 'react';
import { AuraIcon } from './icons';

interface AuraChatButtonProps {
  onClick: () => void;
}

const AuraChatButton: React.FC<AuraChatButtonProps> = ({ onClick }) => {
  return (
    <button
      onClick={onClick}
      className="fixed bottom-6 right-6 bg-cyan-600 hover:bg-cyan-500 text-white rounded-full p-4 shadow-2xl transition-all duration-300 ease-in-out transform hover:scale-110 z-40 animate-fadeIn"
      aria-label="Chat with AURA"
    >
      <AuraIcon className="h-8 w-8" />
    </button>
  );
};

export default AuraChatButton;
