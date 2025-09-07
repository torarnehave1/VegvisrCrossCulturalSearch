/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState, useCallback, useMemo } from 'react';
import { performPhonosemanticSearch, type PhonosemanticResult } from '../services/geminiService';
import FilterBar from './FilterBar';
import ResultCard from './ResultCard';
import LoadingSkeleton from './LoadingSkeleton';

type Filters = {
  position: 'initial' | 'medial' | 'final' | 'any';
  languages: string;
  fuzzy: boolean;
};

const PhonosemanticMiner: React.FC = () => {
  const [filters, setFilters] = useState<Filters>({
    position: 'any',
    languages: 'Sanskrit, Hebrew, Arabic, Proto-Indo-European',
    fuzzy: false,
  });
  const [results, setResults] = useState<PhonosemanticResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = useCallback(async (newFilters: Filters) => {
    setIsLoading(true);
    setError(null);
    setResults([]);
    try {
      const searchResults = await performPhonosemanticSearch(newFilters);
      setResults(searchResults);
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : 'An unknown error occurred during the search.';
      setError(errorMessage);
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const groupedResults = useMemo(() => {
    if (!results) return {};
    return results.reduce((acc, result) => {
      const cluster = result.semantic_cluster || 'Uncategorized';
      if (!acc[cluster]) {
        acc[cluster] = [];
      }
      acc[cluster].push(result);
      return acc;
    }, {} as Record<string, PhonosemanticResult[]>);
  }, [results]);

  return (
    <div>
      <FilterBar initialFilters={filters} onSearch={handleSearch} isLoading={isLoading} />
      
      {isLoading && <LoadingSkeleton />}

      {error && (
        <div style={{ border: '1px solid #cc0000', padding: '1rem', color: '#cc0000', marginTop: '1rem' }}>
          <p style={{ margin: 0 }}>A Search Error Occurred</p>
          <p style={{ marginTop: '0.5rem', margin: 0 }}>{error}</p>
        </div>
      )}

      {!isLoading && !error && results.length === 0 && (
        <div style={{ color: '#888', padding: '2rem 0', textAlign: 'center' }}>
          <p>No results found. Try adjusting your filters.</p>
        </div>
      )}

      {!isLoading && Object.keys(groupedResults).length > 0 && (
         <div>
         {Object.entries(groupedResults).map(([cluster, items]) => (
           <div key={cluster} className="result-cluster">
             <h3>{cluster}</h3>
             {items.map((item, index) => (
               <ResultCard key={`${item.lemma}-${index}`} data={item} />
             ))}
           </div>
         ))}
       </div>
      )}
    </div>
  );
};

export default PhonosemanticMiner;
