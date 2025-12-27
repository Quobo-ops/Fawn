/**
 * @fawn/indexing
 *
 * Memory Indexing System for the Fawn AI Companion
 *
 * This package provides a hierarchical document storage system that
 * synthesizes raw memories into comprehensive user profiles, organized
 * like folders in Google Drive.
 *
 * Key Components:
 * - IndexManager: Central orchestrator for document lifecycle
 * - DriveService: Google Drive integration for cloud storage
 * - SynthesisEngine: AI-powered document generation
 * - Categories: Predefined index taxonomy (A001-J999)
 */

// Types
export type {
  IndexDomain,
  IndexCode,
  IndexCategory,
  IndexDocument,
  IndexDirective,
  ContextRequest,
  ContextPackage,
  MemoryIndexMapping,
  DriveSyncStatus,
} from './types';

// Categories
export {
  DOMAINS,
  CATEGORIES,
  getCategoryByCode,
  getCategoriesByDomain,
  getCategoriesByPriority,
  parseIndexCode,
  generateIndexCode,
} from './categories';

// Drive Service
export {
  DriveService,
  createDriveService,
  type DriveCredentials,
  type UserDriveTokens,
  type DriveConfig,
} from './drive-service';

// Synthesis Engine
export {
  synthesizeDocument,
  classifyMemoryToIndices,
  batchClassifyMemories,
  shouldRegenerateDocument,
  generateContextSummary,
} from './synthesis-engine';

// Index Manager
export { IndexManager } from './index-manager';
