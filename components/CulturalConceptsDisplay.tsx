/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import type { CulturalConcept } from '../services/geminiService';

interface CulturalConceptsDisplayProps {
  concepts: CulturalConcept[];
  isLoading: boolean;
  error: string | null;
  onConceptClick: (concept: string) => void;
}

const CulturalConceptsDisplay: React.FC<CulturalConceptsDisplayProps> = ({
  concepts,
  isLoading,
  error,
  onConceptClick,
}) => {

  if (isLoading) {
    return (
      <div className="cultural-concepts-container" aria-live="polite">
        <p className="cultural-concepts-loading">Finding cultural connections...</p>
      </div>
    );
  }

  // Fail gracefully by hiding the component on error.
  // The error is logged to the console in App.tsx.
  if (error) {
    return null;
  }

  if (!concepts || concepts.length === 0) {
    return null; // Don't render anything if there are no concepts
  }

  return (
    <div className="cultural-concepts-container">
      <h3 className="cultural-concepts-title">Cultural Lenses</h3>
      <div className="cultural-concepts-list">
        {concepts.map((concept, index) => (
          <React.Fragment key={concept.term}>
            <button
              onClick={() => onConceptClick(concept.term)}
              className="interactive-word"
              aria-label={`Learn more about ${concept.term} from ${concept.culture} culture`}
            >
              {concept.term}
              <span className="concept-culture"> ({concept.culture})</span>
            </button>
            {index < concepts.length - 1 && ', '}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export default CulturalConceptsDisplay;