import {
  pgTable,
  uuid,
  text,
  timestamp,
  jsonb,
  index,
  real,
  integer,
  boolean,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import { users } from './users';
import { memories } from './memories';

/**
 * Index Documents - Synthesized deep-dives stored locally and synced to Google Drive
 *
 * Each document represents a comprehensive understanding of a specific aspect
 * of the user (e.g., A001 = Core Values, B003 = Friendships)
 */
export const indexDocuments = pgTable(
  'index_documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .references(() => users.id)
      .notNull(),

    // Index classification
    indexCode: text('index_code').notNull(), // e.g., 'A001', 'B003'
    domain: text('domain').notNull(), // 'A' through 'J'

    // Google Drive references
    driveFileId: text('drive_file_id'),
    driveFolderId: text('drive_folder_id'),
    driveUrl: text('drive_url'),

    // Document content
    title: text('title').notNull(),
    content: text('content').notNull(), // The synthesized deep-dive
    summary: text('summary').notNull(), // Brief overview for quick context

    // Structured insights (stored as JSONB arrays)
    keyInsights: jsonb('key_insights').$type<string[]>().default([]),
    patterns: jsonb('patterns').$type<string[]>().default([]),
    recommendations: jsonb('recommendations').$type<string[]>().default([]),

    // Embedding for semantic search
    embedding: text('embedding'), // Will be cast to vector in queries

    // Source tracking
    sourceMemoryIds: jsonb('source_memory_ids').$type<string[]>().default([]),
    memoryCount: integer('memory_count').default(0),

    // Quality and freshness
    confidence: real('confidence').default(0.5), // 0-1
    version: integer('version').default(1),

    // Status flags
    status: text('status').default('draft'), // 'draft', 'active', 'stale', 'archived'
    needsRegeneration: boolean('needs_regeneration').default(false),

    // Sync tracking
    lastSyncedAt: timestamp('last_synced_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    userIdx: index('index_documents_user_idx').on(table.userId),
    indexCodeIdx: index('index_documents_code_idx').on(table.indexCode),
    domainIdx: index('index_documents_domain_idx').on(table.domain),
    userCodeUnique: uniqueIndex('index_documents_user_code_unique').on(
      table.userId,
      table.indexCode
    ),
    statusIdx: index('index_documents_status_idx').on(table.status),
  })
);

/**
 * Memory Index Mappings - Links memories to their contributing index documents
 *
 * Tracks which memories contributed to which synthesized documents,
 * enabling updates when new related memories are added
 */
export const memoryIndexMappings = pgTable(
  'memory_index_mappings',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id')
      .references(() => memories.id)
      .notNull(),
    indexDocumentId: uuid('index_document_id')
      .references(() => indexDocuments.id)
      .notNull(),

    // How much this memory contributes to the document
    contribution: text('contribution').default('supporting'), // 'primary', 'supporting', 'minor'
    relevanceScore: real('relevance_score').default(0.5), // 0-1

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    memoryIdx: index('memory_index_mappings_memory_idx').on(table.memoryId),
    documentIdx: index('memory_index_mappings_document_idx').on(table.indexDocumentId),
  })
);

/**
 * Index Directives - Metadata attached to embeddings pointing to relevant documents
 *
 * When a memory embedding is created, it includes directives about which
 * index documents should be consulted for full context
 */
export const indexDirectives = pgTable(
  'index_directives',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    memoryId: uuid('memory_id')
      .references(() => memories.id)
      .notNull(),

    // Primary index for this memory's context
    primaryIndexCode: text('primary_index_code').notNull(),

    // Related indices that may provide additional context
    relatedIndexCodes: jsonb('related_index_codes').$type<string[]>().default([]),

    // How confident we are in this mapping
    confidence: real('confidence').default(0.7), // 0-1

    // Priority for retrieval
    retrievalPriority: text('retrieval_priority').default('medium'), // 'high', 'medium', 'low'

    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at').defaultNow().notNull(),
  },
  (table) => ({
    memoryIdx: uniqueIndex('index_directives_memory_idx').on(table.memoryId),
    primaryCodeIdx: index('index_directives_primary_code_idx').on(table.primaryIndexCode),
  })
);

/**
 * User Drive Config - Stores Google Drive connection info per user
 */
export const userDriveConfigs = pgTable('user_drive_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id')
    .references(() => users.id)
    .notNull()
    .unique(),

  // OAuth tokens (encrypted in production)
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenExpiresAt: timestamp('token_expires_at'),

  // Folder structure IDs
  rootFolderId: text('root_folder_id'),
  domainFolderIds: jsonb('domain_folder_ids').$type<Record<string, string>>(),

  // Sync status
  lastFullSync: timestamp('last_full_sync'),
  lastIncrementalSync: timestamp('last_incremental_sync'),
  syncStatus: text('sync_status').default('pending'), // 'synced', 'syncing', 'error', 'pending'
  syncErrors: jsonb('sync_errors').$type<string[]>().default([]),

  // Feature flags
  autoSync: boolean('auto_sync').default(true),
  syncEnabled: boolean('sync_enabled').default(false), // User must enable

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Type exports
export type IndexDocument = typeof indexDocuments.$inferSelect;
export type NewIndexDocument = typeof indexDocuments.$inferInsert;
export type MemoryIndexMapping = typeof memoryIndexMappings.$inferSelect;
export type IndexDirective = typeof indexDirectives.$inferSelect;
export type UserDriveConfig = typeof userDriveConfigs.$inferSelect;
