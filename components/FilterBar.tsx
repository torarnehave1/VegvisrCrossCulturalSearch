/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';

type Filters = {
  position: 'initial' | 'medial' | 'final' | 'any';
  languages: string;
  fuzzy: boolean;
};

interface FilterBarProps {
  initialFilters: Filters;
  onSearch: (filters: Filters) => void;
  isLoading: boolean;
}

const FilterBar: React.FC<FilterBarProps> = ({ initialFilters, onSearch, isLoading }) => {
  const [filters, setFilters] = useState<Filters>(initialFilters);

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isLoading) {
      onSearch(filters);
    }
  };

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = event.target;
    const isCheckbox = type === 'checkbox';
    const checked = isCheckbox ? (event.target as HTMLInputElement).checked : undefined;

    setFilters(prev => ({
      ...prev,
      [name]: isCheckbox ? checked : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="filter-bar" aria-labelledby="filter-heading">
      <h2 id="filter-heading" className="sr-only">Search Filters</h2>
      
      <div className="filter-group">
        <label htmlFor="languages">Languages</label>
        <input
          type="text"
          id="languages"
          name="languages"
          value={filters.languages}
          onChange={handleInputChange}
          disabled={isLoading}
          placeholder="e.g., Arabic, Hebrew"
        />
      </div>

      <div className="filter-group">
        <label htmlFor="position">Motif Position</label>
        <select
          id="position"
          name="position"
          value={filters.position}
          onChange={handleInputChange}
          disabled={isLoading}
        >
          <option value="any">Any</option>
          <option value="initial">Initial</option>
          <option value="medial">Medial</option>
          <option value="final">Final</option>
        </select>
      </div>
      
      <div className="filter-group checkbox-group">
        <input
          type="checkbox"
          id="fuzzy"
          name="fuzzy"
          checked={filters.fuzzy}
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <label htmlFor="fuzzy">Fuzzy Match</label>
      </div>

      <button type="submit" disabled={isLoading}>
        {isLoading ? 'Searching...' : 'Search'}
      </button>
    </form>
  );
};

export default FilterBar;
