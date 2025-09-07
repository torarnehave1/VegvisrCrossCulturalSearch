/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import type { PhonosemanticResult } from '../services/geminiService';

interface ResultCardProps {
  data: PhonosemanticResult;
}

const ResultCard: React.FC<ResultCardProps> = ({ data }) => {
  return (
    <article className="result-card" aria-labelledby={`lemma-${data.lemma}`}>
      <header className="result-card-header">
        <h4 id={`lemma-${data.lemma}`} className="lemma">{data.romanization}</h4>
        {data.script && data.lemma !== data.romanization && (
          <span className="script" lang={data.language.substring(0,2)}>({data.lemma})</span>
        )}
        {data.IPA && <span className="ipa">[{data.IPA}]</span>}
      </header>
      <div className="result-card-body">
        <p><strong>({data.language})</strong>: {data.gloss}</p>
        {data.etymology && <p><strong>Etymology:</strong> {data.etymology}</p>}
        {data.cultural_tags && data.cultural_tags.length > 0 && (
          <p className="tags">Tags: {data.cultural_tags.join(', ')}</p>
        )}
        {data.source_url && (
            <a 
              href={data.source_url} 
              target="_blank" 
              rel="noopener noreferrer"
              className="source-link"
            >
              Source
            </a>
        )}
      </div>
    </article>
  );
};

export default ResultCard;
