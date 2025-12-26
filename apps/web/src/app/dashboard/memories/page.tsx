'use client';

import { useEffect, useState } from 'react';
import { api, Memory } from '@/lib/api';
import { Search, Brain, Filter } from 'lucide-react';
import { clsx } from 'clsx';

const CATEGORIES = [
  { value: '', label: 'All' },
  { value: 'fact', label: 'Facts' },
  { value: 'preference', label: 'Preferences' },
  { value: 'goal', label: 'Goals' },
  { value: 'event', label: 'Events' },
  { value: 'relationship', label: 'Relationships' },
  { value: 'emotion', label: 'Emotions' },
  { value: 'insight', label: 'Insights' },
];

export default function MemoriesPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [searching, setSearching] = useState(false);

  useEffect(() => {
    loadMemories();
  }, [selectedCategory]);

  async function loadMemories() {
    setLoading(true);
    try {
      const data = await api.getMemories({
        category: selectedCategory || undefined,
        limit: 50,
      });
      setMemories(data.memories);
    } catch (error) {
      console.error('Failed to load memories:', error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSearch() {
    if (!searchQuery.trim()) {
      loadMemories();
      return;
    }

    setSearching(true);
    try {
      const data = await api.searchMemories(searchQuery);
      setMemories(data.results);
    } catch (error) {
      console.error('Search failed:', error);
    } finally {
      setSearching(false);
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-800 mb-2">Memories</h1>
        <p className="text-gray-600">
          Everything your companion knows about you
        </p>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            placeholder="Search your memories..."
            className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-fawn-500 focus:border-fawn-500"
          />
        </div>
        <button
          onClick={handleSearch}
          disabled={searching}
          className="px-6 py-2.5 bg-fawn-600 text-white rounded-lg hover:bg-fawn-700 transition font-medium disabled:opacity-50"
        >
          {searching ? 'Searching...' : 'Search'}
        </button>
      </div>

      {/* Category Filters */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setSelectedCategory(cat.value)}
            className={clsx(
              'px-4 py-1.5 rounded-full text-sm font-medium transition',
              selectedCategory === cat.value
                ? 'bg-fawn-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            )}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Memories List */}
      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading memories...</div>
      ) : memories.length === 0 ? (
        <div className="text-center py-12">
          <Brain className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No memories found</p>
          <p className="text-sm text-gray-400 mt-1">
            Start chatting with your companion to build memories
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {memories.map((memory) => (
            <MemoryCard key={memory.id} memory={memory} />
          ))}
        </div>
      )}
    </div>
  );
}

function MemoryCard({ memory }: { memory: Memory }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <p className="text-gray-800">{memory.content}</p>
          <div className="flex items-center gap-3 mt-2">
            <span className="inline-flex items-center px-2 py-0.5 bg-fawn-50 text-fawn-700 rounded text-xs font-medium capitalize">
              {memory.category}
            </span>
            <span className="text-xs text-gray-400">
              Importance: {memory.importance}/10
            </span>
            {memory.tags && memory.tags.length > 0 && (
              <div className="flex gap-1">
                {memory.tags.map((tag) => (
                  <span
                    key={tag}
                    className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
