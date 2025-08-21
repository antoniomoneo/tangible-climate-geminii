import React, { useState, useEffect } from 'react';
import { locales } from '../locales';
import type { Language } from '../types';

const AdminScreen: React.FC = () => {
  console.log('Rendering AdminScreen component version: FINAL_VERSION');
  const [language, setLanguage] = useState<Language>('en');
  const [apiKey, setApiKey] = useState('');
  const [assistantId, setAssistantId] = useState('');
  const [saveStatus, setSaveStatus] = useState('');

  const t = locales[language];

  useEffect(() => {
    // Load saved credentials from local storage when the component mounts
    const savedApiKey = localStorage.getItem('openai-api-key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }
    const savedAssistantId = localStorage.getItem('openai-assistant-id');
    if (savedAssistantId) {
      setAssistantId(savedAssistantId);
    }
  }, []);

  const handleSaveCredentials = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('openai-api-key', apiKey);
    localStorage.setItem('openai-assistant-id', assistantId);
    setSaveStatus(t.adminSaveSuccess);
    setTimeout(() => setSaveStatus(''), 3000); // Clear status after 3 seconds
  };
  
  const handleLanguageToggle = () => {
    setLanguage(prev => prev === 'en' ? 'es' : 'en');
  }

  return (
     <div className="bg-gray-900 text-gray-200 min-h-screen flex flex-col items-center justify-center p-4">
        <div className="bg-gray-800 p-8 rounded-xl shadow-2xl border border-gray-700 w-full max-w-2xl">
           <div className="flex justify-between items-center mb-6">
                <h1 className="font-title text-3xl text-cyan-400">{t.adminTitle}</h1>
                <button onClick={handleLanguageToggle} className="text-sm text-gray-400 hover:text-white">{language === 'en' ? 'Español' : 'English'}</button>
            </div>

            <p className="text-gray-400 mb-4">{t.adminApiKeyPrompt}</p>

            <form onSubmit={handleSaveCredentials} className="space-y-4">
                <div>
                    <label htmlFor="apiKey" className="block text-sm font-medium text-gray-300 mb-1">{t.adminApiKeyField}</label>
                    <input
                        id="apiKey"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="sk-..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                    />
                </div>
                 <div>
                    <label htmlFor="assistantId" className="block text-sm font-medium text-gray-300 mb-1">{t.adminAssistantIdField}</label>
                    <input
                        id="assistantId"
                        type="text"
                        value={assistantId}
                        onChange={(e) => setAssistantId(e.target.value)}
                        placeholder="asst_..."
                        className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-cyan-500"
                        required
                    />
                </div>
                
                {saveStatus && <p className="text-green-400 text-sm">{saveStatus}</p>}

                <div className="flex items-center gap-4 mt-6">
                     <button
                        type="submit"
                        className="flex-grow bg-cyan-600 hover:bg-cyan-700 text-white font-bold py-2 px-4 rounded-lg transition-colors"
                    >
                        {t.adminSaveButton}
                    </button>
                    <a href="/#/" className="flex-grow text-center bg-gray-600 hover:bg-gray-700 text-white font-bold py-2 px-4 rounded-lg transition-colors">
                        {t.adminGoBackButton}
                    </a>
                </div>
            </form>
        </div>
     </div>
  );
};

export default AdminScreen;