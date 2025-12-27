import { describe, it, expect, vi, beforeEach } from 'vitest';
import { checkMemoryConflicts } from './memory-extractor';

// Mock Anthropic
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn(),
    },
  })),
}));

describe('Memory Extractor', () => {
  describe('checkMemoryConflicts', () => {
    beforeEach(() => {
      vi.clearAllMocks();
    });

    it('should return empty arrays when no existing memories', async () => {
      const newMemory = {
        content: 'I like coffee',
        category: 'preference',
        importance: 5,
      };

      const result = await checkMemoryConflicts(newMemory, []);

      expect(result.supersedes).toEqual([]);
      expect(result.contradicts).toEqual([]);
      expect(result.relatedTo).toEqual([]);
    });

    // Note: More comprehensive tests would mock the Anthropic API response
    // to test the actual conflict detection logic
  });
});
