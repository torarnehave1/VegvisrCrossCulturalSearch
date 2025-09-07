/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback } from 'react';
import { getScriptForWord, type ScriptResult } from '../services/geminiService';
import LoadingSkeleton from './LoadingSkeleton';

const ScriptWriter: React.FC = () => {
  const [word, setWord] = useState('love');
  const [language, setLanguage] = useState('Hebrew');
  const [result, setResult] = useState<ScriptResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!word.trim() || !language.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const searchResult = await getScriptForWord(word.trim(), language.trim());
      setResult(searchResult);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred.';
      setError(errorMessage);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, [word, language, isLoading]);

  return (
    <div>
      <form onSubmit={handleSearch} className="filter-bar" aria-labelledby="script-writer-heading">
        <h2 id="script-writer-heading" className="sr-only">Script Writer</h2>
        
        <div className="filter-group">
          <label htmlFor="word">Word / Concept</label>
          <input
            type="text"
            id="word"
            name="word"
            value={word}
            onChange={(e) => setWord(e.target.value)}
            disabled={isLoading}
            placeholder="e.g., love"
          />
        </div>

        <div className="filter-group">
          <label htmlFor="language">Language</label>
          <input
            type="text"
            id="language"
            name="language"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isLoading}
            placeholder="e.g., Hebrew"
          />
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? 'Writing...' : 'Write'}
        </button>
      </form>

      {isLoading && <LoadingSkeleton />}

      {error && (
        <div style={{ border: '1px solid #cc0000', padding: '1rem', color: '#cc0000', marginTop: '1rem' }}>
          <p style={{ margin: 0 }}>An Error Occurred</p>
          <p style={{ marginTop: '0.5rem', margin: 0 }}>{error}</p>
        </div>
      )}
      
      {result && !isLoading && (
        <div className="script-writer-result">
          <p className="result-script" lang={result.language.substring(0, 2)}>
            {result.script}
          </p>
          <div className="result-details">
            <p><strong>{result.romanization}</strong> [{result.ipa}]</p>
            <p className="note"><em>{result.note}</em></p>
          </div>
        </div>
      )}
    </div>
  );
};

export default ScriptWriter;
