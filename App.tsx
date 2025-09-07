/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useEffect, useCallback } from 'react';
import { streamDefinition, generateAsciiArt, AsciiArtData, getCrossCulturalConcepts, type CulturalConcept } from './services/geminiService';
import ContentDisplay from './components/ContentDisplay';
import SearchBar from './components/SearchBar';
import LoadingSkeleton from './components/LoadingSkeleton';
import AsciiArtDisplay from './components/AsciiArtDisplay';
import CulturalConceptsDisplay from './components/CulturalConceptsDisplay';
import PhonosemanticMiner from './components/PhonosemanticMiner';
import ScriptWriter from './components/ScriptWriter';

// A curated list of "banger" words and phrases for the random button.
const PREDEFINED_WORDS = [
  // List 1
  'Balance', 'Harmony', 'Discord', 'Unity', 'Fragmentation', 'Clarity', 'Ambiguity', 'Presence', 'Absence', 'Creation', 'Destruction', 'Light', 'Shadow', 'Beginning', 'Ending', 'Rising', 'Falling', 'Connection', 'Isolation', 'Hope', 'Despair',
  // Complex phrases from List 1
  'Order and chaos', 'Light and shadow', 'Sound and silence', 'Form and formlessness', 'Being and nonbeing', 'Presence and absence', 'Motion and stillness', 'Unity and multiplicity', 'Finite and infinite', 'Sacred and profane', 'Memory and forgetting', 'Question and answer', 'Search and discovery', 'Journey and destination', 'Dream and reality', 'Time and eternity', 'Self and other', 'Known and unknown', 'Spoken and unspoken', 'Visible and invisible',
  // List 2
  'Zigzag', 'Waves', 'Spiral', 'Bounce', 'Slant', 'Drip', 'Stretch', 'Squeeze', 'Float', 'Fall', 'Spin', 'Melt', 'Rise', 'Twist', 'Explode', 'Stack', 'Mirror', 'Echo', 'Vibrate',
  // List 3
  'Gravity', 'Friction', 'Momentum', 'Inertia', 'Turbulence', 'Pressure', 'Tension', 'Oscillate', 'Fractal', 'Quantum', 'Entropy', 'Vortex', 'Resonance', 'Equilibrium', 'Centrifuge', 'Elastic', 'Viscous', 'Refract', 'Diffuse', 'Cascade', 'Levitate', 'Magnetize', 'Polarize', 'Accelerate', 'Compress', 'Undulate',
  // List 4
  'Liminal', 'Ephemeral', 'Paradox', 'Zeitgeist', 'Metamorphosis', 'Synesthesia', 'Recursion', 'Emergence', 'Dialectic', 'Apophenia', 'Limbo', 'Flux', 'Sublime', 'Uncanny', 'Palimpsest', 'Chimera', 'Void', 'Transcend', 'Ineffable', 'Qualia', 'Gestalt', 'Simulacra', 'Abyssal',
  // List 5
  'Existential', 'Nihilism', 'Solipsism', 'Phenomenology', 'Hermeneutics', 'Deconstruction', 'Postmodern', 'Absurdism', 'Catharsis', 'Epiphany', 'Melancholy', 'Nostalgia', 'Longing', 'Reverie', 'Pathos', 'Ethos', 'Logos', 'Mythos', 'Anamnesis', 'Intertextuality', 'Metafiction', 'Stream', 'Lacuna', 'Caesura', 'Enjambment'
];
const UNIQUE_WORDS = [...new Set(PREDEFINED_WORDS)];


/**
 * Creates a simple ASCII art bounding box as a fallback.
 * @param topic The text to display inside the box.
 * @returns An AsciiArtData object with the generated art.
 */
const createFallbackArt = (topic: string): AsciiArtData => {
  const displayableTopic = topic.length > 20 ? topic.substring(0, 17) + '...' : topic;
  const paddedTopic = ` ${displayableTopic} `;
  const topBorder = `┌${'─'.repeat(paddedTopic.length)}┐`;
  const middle = `│${paddedTopic}│`;
  const bottomBorder = `└${'─'.repeat(paddedTopic.length)}┘`;
  return {
    art: `${topBorder}\n${middle}\n${bottomBorder}`
  };
};

const App: React.FC = () => {
  const [currentTopic, setCurrentTopic] = useState<string>('Hypertext');
  const [content, setContent] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [asciiArt, setAsciiArt] = useState<AsciiArtData | null>(null);
  const [generationTime, setGenerationTime] = useState<number | null>(null);
  const [culturalConcepts, setCulturalConcepts] = useState<CulturalConcept[]>([]);
  const [isCulturalLoading, setIsCulturalLoading] = useState<boolean>(false);
  const [culturalError, setCulturalError] = useState<string | null>(null);
  const [mode, setMode] = useState<'wiki' | 'miner' | 'writer'>('wiki');


  useEffect(() => {
    if (!currentTopic || mode !== 'wiki') return;

    let isCancelled = false;

    const fetchAllData = async () => {
      // Set initial state for a clean page load
      setIsLoading(true);
      setError(null);
      setContent(''); // Clear previous content immediately
      setAsciiArt(null);
      setGenerationTime(null);
      setIsCulturalLoading(true);
      setCulturalConcepts([]);
      setCulturalError(null);

      const startTime = performance.now();

      // Kick off ASCII art generation, but don't wait for it.
      generateAsciiArt(currentTopic)
        .then(art => {
          if (!isCancelled) {
            setAsciiArt(art);
          }
        })
        .catch(err => {
          if (!isCancelled) {
            console.error("Failed to generate ASCII art:", err);
            setAsciiArt(createFallbackArt(currentTopic));
          }
        });
        
      // Kick off cultural concepts generation
      getCrossCulturalConcepts(currentTopic)
        .then(concepts => {
          if (!isCancelled) setCulturalConcepts(concepts);
        })
        .catch(err => {
          if (!isCancelled) {
            console.error("Failed to get cultural concepts:", err);
            setCulturalError(err instanceof Error ? err.message : 'Could not load concepts.');
          }
        })
        .finally(() => {
          if (!isCancelled) setIsCulturalLoading(false);
        });

      let accumulatedContent = '';
      try {
        for await (const chunk of streamDefinition(currentTopic)) {
          if (isCancelled) break;
          
          if (chunk.startsWith('Error:')) {
            throw new Error(chunk);
          }
          accumulatedContent += chunk;
          if (!isCancelled) {
            setContent(accumulatedContent);
          }
        }
      } catch (e: unknown) {
        if (!isCancelled) {
          const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred';
          setError(errorMessage);
          setContent(''); // Ensure content is clear on error
          console.error(e);
        }
      } finally {
        if (!isCancelled) {
          const endTime = performance.now();
          setGenerationTime(endTime - startTime);
          setIsLoading(false);
        }
      }
    };

    fetchAllData();
    
    return () => {
      isCancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTopic, mode]);

  const handleWordClick = useCallback((word: string) => {
    const newTopic = word.trim();
    if (newTopic && newTopic.toLowerCase() !== currentTopic.toLowerCase()) {
      setCurrentTopic(newTopic);
      setMode('wiki'); // Ensure we are in wiki mode when clicking words
    }
  }, [currentTopic]);

  const handleSearch = useCallback((topic: string) => {
    const newTopic = topic.trim();
    if (newTopic && newTopic.toLowerCase() !== currentTopic.toLowerCase()) {
      setCurrentTopic(newTopic);
      setMode('wiki'); // Searching always defaults to wiki mode
    }
  }, [currentTopic]);

  const handleRandom = useCallback(() => {
    setIsLoading(true); // Disable UI immediately
    setError(null);
    setContent('');
    setAsciiArt(null);
    setMode('wiki'); // Random button is part of wiki mode

    const randomIndex = Math.floor(Math.random() * UNIQUE_WORDS.length);
    const randomWord = UNIQUE_WORDS[randomIndex];

    // Prevent picking the same word twice in a row
    if (randomWord.toLowerCase() === currentTopic.toLowerCase()) {
      const nextIndex = (randomIndex + 1) % UNIQUE_WORDS.length;
      setCurrentTopic(UNIQUE_WORDS[nextIndex]);
    } else {
      setCurrentTopic(randomWord);
    }
  }, [currentTopic]);


  return (
    <div>
      <header style={{ textAlign: 'center', marginBottom: '2rem' }}>
        <h1 style={{ letterSpacing: '0.2em', textTransform: 'uppercase' }}>
          {mode === 'wiki' && 'INFINITE WIKI'}
          {mode === 'miner' && 'PHONOSEMANTIC MINER'}
          {mode === 'writer' && 'SCRIPT WRITER'}
        </h1>
        {mode === 'wiki' && <AsciiArtDisplay artData={asciiArt} topic={currentTopic} />}
      </header>
      
      <div className="mode-toggle">
        <button onClick={() => setMode('wiki')} className={mode === 'wiki' ? 'active' : ''}>
          Infinite Wiki
        </button>
        <button onClick={() => setMode('miner')} className={mode === 'miner' ? 'active' : ''}>
          Phonosemantic Miner
        </button>
        <button onClick={() => setMode('writer')} className={mode === 'writer' ? 'active' : ''}>
          Script Writer
        </button>
      </div>

      {mode === 'wiki' ? (
        <main>
          <SearchBar onSearch={handleSearch} onRandom={handleRandom} isLoading={isLoading} />
          <div>
            <h2 style={{ marginBottom: '2rem', textTransform: 'capitalize' }}>
              {currentTopic}
            </h2>

            {error && (
              <div style={{ border: '1px solid #cc0000', padding: '1rem', color: '#cc0000' }}>
                <p style={{ margin: 0 }}>An Error Occurred</p>
                <p style={{ marginTop: '0.5rem', margin: 0 }}>{error}</p>
              </div>
            )}
            
            {isLoading && content.length === 0 && !error && (
              <LoadingSkeleton />
            )}

            {content.length > 0 && !error && (
              <ContentDisplay 
                content={content} 
                isLoading={isLoading} 
                onWordClick={handleWordClick} 
              />
            )}

            {!isLoading && !error && content.length === 0 && (
              <div style={{ color: '#888', padding: '2rem 0' }}>
                <p>Content could not be generated.</p>
              </div>
            )}

            <CulturalConceptsDisplay
              concepts={culturalConcepts}
              isLoading={isCulturalLoading}
              error={culturalError}
              onConceptClick={handleWordClick}
            />
          </div>
        </main>
      ) : mode === 'miner' ? (
        <main>
          <PhonosemanticMiner />
        </main>
      ) : (
        <main>
          <ScriptWriter />
        </main>
      )}

      <footer className="sticky-footer">
        <p className="footer-text" style={{ margin: 0 }}>
          Infinite Wiki by <a href="https://x.com/dev_valladares" target="_blank" rel="noopener noreferrer">Dev Valladares</a> · Generated by Gemini
          {mode === 'wiki' && generationTime && ` · ${Math.round(generationTime)}ms`}
        </p>
      </footer>
    </div>
  );
};

export default App;