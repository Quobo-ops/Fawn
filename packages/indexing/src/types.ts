/**
 * Memory Indexing System Types
 *
 * This system organizes user insights into a hierarchical structure
 * similar to Google Drive folders. Each index code (e.g., A001) represents
 * a specific category of synthesized knowledge about the user.
 */

/**
 * Major life domains - the letter prefix in index codes
 * Each domain contains multiple specific topics (A-Z = 26 domains)
 */
export type IndexDomain =
  | 'A' // Identity & Core Self
  | 'B' // Relationships & Social
  | 'C' // Career & Professional
  | 'D' // Health & Wellness
  | 'E' // Goals & Aspirations
  | 'F' // Emotional Patterns
  | 'G' // Life Events & History
  | 'H' // Preferences & Interests
  | 'I' // Communication & Expression
  | 'J' // Challenges & Growth
  | 'K' // Knowledge & Learning
  | 'L' // Lifestyle & Routines
  | 'M' // Money & Finances
  | 'N' // Nature & Environment
  | 'O' // Opinions & Perspectives
  | 'P' // Personality Quirks
  | 'Q' // Questions & Curiosities
  | 'R' // Recreation & Leisure
  | 'S' // Spirituality & Meaning
  | 'T' // Technology & Digital
  | 'U' // Uncertainties & Fears
  | 'V' // Values & Ethics
  | 'W' // Work Style & Productivity
  | 'X' // eXperiences Sought
  | 'Y' // Yearnings & Desires
  | 'Z'; // Zones of Comfort

/**
 * Full index code combining domain letter and topic number
 * Examples: A001, B003, C012
 */
export type IndexCode = `${IndexDomain}${string}`;

/**
 * Category metadata defining the structure of each index
 */
export interface IndexCategory {
  code: IndexCode;
  domain: IndexDomain;
  domainName: string;
  topicNumber: string;
  topicName: string;
  description: string;
  parentCode?: IndexCode; // For nested subcategories
  priority: number; // 1-10, affects retrieval order
}

/**
 * The actual document stored in Google Drive
 * This is a synthesized deep-dive, not a transcript
 */
export interface IndexDocument {
  id: string; // UUID
  userId: string;
  indexCode: IndexCode;

  // Google Drive references
  driveFileId?: string;
  driveFolderId?: string;
  driveUrl?: string;

  // Document content
  title: string;
  content: string; // The synthesized deep-dive
  summary: string; // Brief overview for quick context

  // Structured insights extracted
  keyInsights: string[];
  patterns: string[];
  recommendations: string[];

  // Embedding for semantic search
  embedding?: number[];

  // Source tracking
  sourceMemoryIds: string[]; // Memories this document is based on
  memoryCount: number;

  // Quality and freshness
  confidence: number; // 0-1, how reliable is this synthesis
  lastUpdatedAt: Date;
  lastSyncedAt?: Date; // Last sync with Google Drive
  version: number;

  // Status
  status: 'draft' | 'active' | 'stale' | 'archived';
  needsRegeneration: boolean;

  createdAt: Date;
}

/**
 * Directive embedded with memories to point to relevant index documents
 * This is what gets stored alongside vector embeddings
 */
export interface IndexDirective {
  primaryIndex: IndexCode; // Most relevant index for this context
  relatedIndices: IndexCode[]; // Secondary relevant indices
  confidence: number; // 0-1, how confident we are in this mapping
  retrievalPriority: 'high' | 'medium' | 'low';
}

/**
 * Context retrieval request
 */
export interface ContextRequest {
  userId: string;
  query?: string; // Optional semantic query
  embedding?: number[]; // Optional embedding for similarity
  domains?: IndexDomain[]; // Filter to specific domains
  indexCodes?: IndexCode[]; // Specific indices to retrieve
  maxDocuments?: number;
  includeRelated?: boolean;
}

/**
 * Context package returned for conversation preparation
 */
export interface ContextPackage {
  documents: IndexDocument[];
  directives: IndexDirective[];
  relevanceScores: Map<IndexCode, number>;
  retrievedAt: Date;

  // Formatted context for injection into prompts
  formattedContext: string;
}

/**
 * Memory-to-Index mapping for tracking which memories
 * contribute to which index documents
 */
export interface MemoryIndexMapping {
  memoryId: string;
  indexCode: IndexCode;
  contribution: 'primary' | 'supporting' | 'minor';
  addedAt: Date;
}

/**
 * Sync status for Google Drive integration
 */
export interface DriveSyncStatus {
  userId: string;
  lastFullSync: Date;
  lastIncrementalSync: Date;
  pendingChanges: number;
  errors: string[];
  status: 'synced' | 'syncing' | 'error' | 'pending';
}
