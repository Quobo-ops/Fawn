/**
 * Index Manager
 *
 * Central orchestrator for the memory indexing system.
 * Manages document lifecycle, synchronization with Google Drive,
 * and context retrieval for conversation preparation.
 */

import { eq, and, inArray, desc, sql } from 'drizzle-orm';
import type { Database } from '@fawn/database';
import {
  indexDocuments,
  memoryIndexMappings,
  indexDirectives,
  userDriveConfigs,
  memories,
} from '@fawn/database';
import { generateEmbedding, cosineSimilarity, serializeEmbedding } from '@fawn/ai';

import type {
  IndexCode,
  IndexDocument,
  IndexDirective,
  ContextRequest,
  ContextPackage,
  IndexDomain,
} from './types';
import { getCategoryByCode, getCategoriesByDomain, parseIndexCode, DOMAINS } from './categories';
import { DriveService, createDriveService, type UserDriveTokens } from './drive-service';
import {
  synthesizeDocument,
  classifyMemoryToIndices,
  shouldRegenerateDocument,
  generateContextSummary,
} from './synthesis-engine';

export class IndexManager {
  private db: Database;

  constructor(db: Database) {
    this.db = db;
  }

  // ==========================================
  // Document Management
  // ==========================================

  /**
   * Get or create an index document for a user
   */
  async getOrCreateDocument(
    userId: string,
    indexCode: IndexCode
  ): Promise<typeof indexDocuments.$inferSelect> {
    const category = getCategoryByCode(indexCode);
    if (!category) {
      throw new Error(`Unknown index code: ${indexCode}`);
    }

    // Check for existing document
    const existing = await this.db
      .select()
      .from(indexDocuments)
      .where(and(eq(indexDocuments.userId, userId), eq(indexDocuments.indexCode, indexCode)))
      .limit(1);

    if (existing.length > 0) {
      return existing[0];
    }

    // Create new document
    const { domain } = parseIndexCode(indexCode);
    const newDoc = await this.db
      .insert(indexDocuments)
      .values({
        userId,
        indexCode,
        domain,
        title: category.topicName,
        content: 'Awaiting memory synthesis...',
        summary: 'No memories have been collected for this topic yet.',
        keyInsights: [],
        patterns: [],
        recommendations: [],
        sourceMemoryIds: [],
        memoryCount: 0,
        confidence: 0,
        status: 'draft',
      })
      .returning();

    return newDoc[0];
  }

  /**
   * Get all documents for a user
   */
  async getUserDocuments(
    userId: string,
    options?: {
      domain?: IndexDomain;
      status?: string;
      minConfidence?: number;
    }
  ): Promise<(typeof indexDocuments.$inferSelect)[]> {
    let query = this.db.select().from(indexDocuments).where(eq(indexDocuments.userId, userId));

    // Note: Additional filtering would be done in application logic
    // since Drizzle's dynamic query building is complex

    const results = await query.orderBy(desc(indexDocuments.updatedAt));

    // Apply filters
    let filtered = results;
    if (options?.domain) {
      filtered = filtered.filter((d) => d.domain === options.domain);
    }
    if (options?.status) {
      filtered = filtered.filter((d) => d.status === options.status);
    }
    if (options?.minConfidence) {
      filtered = filtered.filter((d) => (d.confidence || 0) >= options.minConfidence!);
    }

    return filtered;
  }

  /**
   * Update a document with new synthesis
   */
  async regenerateDocument(
    userId: string,
    indexCode: IndexCode,
    forceRegenerate: boolean = false
  ): Promise<typeof indexDocuments.$inferSelect> {
    // Get existing document
    const doc = await this.getOrCreateDocument(userId, indexCode);

    // Check if regeneration is needed
    if (!forceRegenerate && !doc.needsRegeneration && doc.status === 'active') {
      return doc;
    }

    // Get all memories mapped to this document
    const mappings = await this.db
      .select({ memoryId: memoryIndexMappings.memoryId })
      .from(memoryIndexMappings)
      .where(eq(memoryIndexMappings.indexDocumentId, doc.id));

    const memoryIds = mappings.map((m) => m.memoryId);

    if (memoryIds.length === 0) {
      return doc;
    }

    // Fetch full memory records
    const memoryRecords = await this.db
      .select()
      .from(memories)
      .where(inArray(memories.id, memoryIds));

    // Synthesize new document content
    const synthesis = await synthesizeDocument(
      indexCode,
      memoryRecords.map((m) => ({
        id: m.id,
        content: m.content,
        category: m.category,
        importance: m.importance || 5,
        metadata: m.metadata || {},
        createdAt: m.createdAt,
        occurredAt: m.occurredAt || undefined,
      })),
      doc
    );

    // Generate embedding for the synthesized content
    const embeddingText = `${synthesis.title}. ${synthesis.summary}. ${synthesis.content}`;
    const embedding = await generateEmbedding(embeddingText);

    // Update document
    const updated = await this.db
      .update(indexDocuments)
      .set({
        title: synthesis.title,
        summary: synthesis.summary,
        content: synthesis.content,
        keyInsights: synthesis.keyInsights,
        patterns: synthesis.patterns,
        recommendations: synthesis.recommendations,
        embedding: serializeEmbedding(embedding),
        confidence: synthesis.confidence,
        memoryCount: memoryIds.length,
        sourceMemoryIds: memoryIds,
        status: 'active',
        needsRegeneration: false,
        version: (doc.version || 0) + 1,
        updatedAt: new Date(),
      })
      .where(eq(indexDocuments.id, doc.id))
      .returning();

    return updated[0];
  }

  // ==========================================
  // Memory Indexing
  // ==========================================

  /**
   * Index a new memory - classify it and update relevant documents
   */
  async indexMemory(
    memoryId: string,
    userId: string,
    memoryContent: string,
    memoryCategory: string,
    importance: number = 5,
    metadata?: Record<string, unknown>
  ): Promise<{ directive: typeof indexDirectives.$inferSelect; affectedDocuments: IndexCode[] }> {
    // Classify the memory to determine relevant indices
    const classification = await classifyMemoryToIndices({
      id: memoryId,
      content: memoryContent,
      category: memoryCategory,
      importance,
      metadata: metadata as any,
      createdAt: new Date(),
    });

    // Create or update directive for this memory
    const existingDirective = await this.db
      .select()
      .from(indexDirectives)
      .where(eq(indexDirectives.memoryId, memoryId))
      .limit(1);

    let directive: typeof indexDirectives.$inferSelect;

    if (existingDirective.length > 0) {
      const updated = await this.db
        .update(indexDirectives)
        .set({
          primaryIndexCode: classification.primaryIndex,
          relatedIndexCodes: classification.relatedIndices,
          confidence: classification.confidence,
          retrievalPriority: importance >= 8 ? 'high' : importance >= 5 ? 'medium' : 'low',
          updatedAt: new Date(),
        })
        .where(eq(indexDirectives.memoryId, memoryId))
        .returning();
      directive = updated[0];
    } else {
      const created = await this.db
        .insert(indexDirectives)
        .values({
          memoryId,
          primaryIndexCode: classification.primaryIndex,
          relatedIndexCodes: classification.relatedIndices,
          confidence: classification.confidence,
          retrievalPriority: importance >= 8 ? 'high' : importance >= 5 ? 'medium' : 'low',
        })
        .returning();
      directive = created[0];
    }

    // Map memory to documents
    const allIndices = [classification.primaryIndex, ...classification.relatedIndices];
    const affectedDocuments: IndexCode[] = [];

    for (const indexCode of allIndices) {
      const doc = await this.getOrCreateDocument(userId, indexCode);

      // Check if mapping exists
      const existingMapping = await this.db
        .select()
        .from(memoryIndexMappings)
        .where(
          and(
            eq(memoryIndexMappings.memoryId, memoryId),
            eq(memoryIndexMappings.indexDocumentId, doc.id)
          )
        )
        .limit(1);

      if (existingMapping.length === 0) {
        await this.db.insert(memoryIndexMappings).values({
          memoryId,
          indexDocumentId: doc.id,
          contribution: indexCode === classification.primaryIndex ? 'primary' : 'supporting',
          relevanceScore: classification.confidence,
        });

        // Mark document for regeneration
        await this.db
          .update(indexDocuments)
          .set({ needsRegeneration: true })
          .where(eq(indexDocuments.id, doc.id));

        affectedDocuments.push(indexCode);
      }
    }

    return { directive, affectedDocuments };
  }

  // ==========================================
  // Context Retrieval
  // ==========================================

  /**
   * Retrieve context for conversation preparation
   */
  async retrieveContext(request: ContextRequest): Promise<ContextPackage> {
    const { userId, query, embedding, domains, indexCodes, maxDocuments = 5 } = request;

    let documents: (typeof indexDocuments.$inferSelect)[] = [];

    if (indexCodes && indexCodes.length > 0) {
      // Direct index retrieval
      documents = await this.db
        .select()
        .from(indexDocuments)
        .where(
          and(
            eq(indexDocuments.userId, userId),
            inArray(indexDocuments.indexCode, indexCodes),
            eq(indexDocuments.status, 'active')
          )
        )
        .limit(maxDocuments);
    } else if (embedding || query) {
      // Semantic retrieval
      const searchEmbedding = embedding || (await generateEmbedding(query!));

      // Get all active documents for user
      const allDocs = await this.db
        .select()
        .from(indexDocuments)
        .where(and(eq(indexDocuments.userId, userId), eq(indexDocuments.status, 'active')));

      // Filter by domain if specified
      let filteredDocs = allDocs;
      if (domains && domains.length > 0) {
        filteredDocs = allDocs.filter((d) => domains.includes(d.domain as IndexDomain));
      }

      // Calculate similarity and rank
      const scored = filteredDocs
        .filter((d) => d.embedding)
        .map((d) => {
          const docEmbedding = JSON.parse(d.embedding!) as number[];
          const similarity = cosineSimilarity(searchEmbedding, docEmbedding);
          return { doc: d, similarity };
        })
        .filter((s) => s.similarity > 0.3) // Threshold
        .sort((a, b) => b.similarity - a.similarity)
        .slice(0, maxDocuments);

      documents = scored.map((s) => s.doc);
    } else {
      // Default: get highest priority documents
      const allDocs = await this.getUserDocuments(userId, { status: 'active' });

      // Sort by category priority
      documents = allDocs
        .map((d) => {
          const category = getCategoryByCode(d.indexCode as IndexCode);
          return { doc: d, priority: category?.priority || 5 };
        })
        .sort((a, b) => b.priority - a.priority)
        .slice(0, maxDocuments)
        .map((d) => d.doc);
    }

    // Get directives for context
    const directives: (typeof indexDirectives.$inferSelect)[] = [];
    if (documents.length > 0) {
      const memoryIds = documents.flatMap((d) => (d.sourceMemoryIds as string[]) || []);
      if (memoryIds.length > 0) {
        const foundDirectives = await this.db
          .select()
          .from(indexDirectives)
          .where(inArray(indexDirectives.memoryId, memoryIds.slice(0, 100)));
        directives.push(...foundDirectives);
      }
    }

    // Calculate relevance scores
    const relevanceScores = new Map<IndexCode, number>();
    documents.forEach((d, i) => {
      // Higher rank = higher score
      relevanceScores.set(d.indexCode as IndexCode, 1 - i * 0.1);
    });

    // Generate formatted context
    const formattedContext = await generateContextSummary(
      documents.map((d) => ({
        ...d,
        keyInsights: (d.keyInsights as string[]) || [],
        patterns: (d.patterns as string[]) || [],
        recommendations: (d.recommendations as string[]) || [],
        sourceMemoryIds: (d.sourceMemoryIds as string[]) || [],
        lastUpdatedAt: d.updatedAt,
      })) as IndexDocument[]
    );

    return {
      documents: documents.map((d) => ({
        ...d,
        keyInsights: (d.keyInsights as string[]) || [],
        patterns: (d.patterns as string[]) || [],
        recommendations: (d.recommendations as string[]) || [],
        sourceMemoryIds: (d.sourceMemoryIds as string[]) || [],
        lastUpdatedAt: d.updatedAt,
      })) as IndexDocument[],
      directives: directives.map((d) => ({
        primaryIndex: d.primaryIndexCode as IndexCode,
        relatedIndices: (d.relatedIndexCodes as IndexCode[]) || [],
        confidence: d.confidence || 0.5,
        retrievalPriority: (d.retrievalPriority as 'high' | 'medium' | 'low') || 'medium',
      })),
      relevanceScores,
      retrievedAt: new Date(),
      formattedContext,
    };
  }

  // ==========================================
  // Google Drive Sync
  // ==========================================

  /**
   * Initialize Google Drive for a user
   */
  async initializeDrive(userId: string, userName: string, tokens: UserDriveTokens): Promise<void> {
    const driveService = createDriveService(tokens);

    // Create folder structure
    const { rootFolderId, domainFolderIds } = await driveService.initializeUserFolders(userName);

    // Store config
    await this.db
      .insert(userDriveConfigs)
      .values({
        userId,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        tokenExpiresAt: tokens.expiryDate ? new Date(tokens.expiryDate) : null,
        rootFolderId,
        domainFolderIds,
        syncStatus: 'synced',
        syncEnabled: true,
      })
      .onConflictDoUpdate({
        target: userDriveConfigs.userId,
        set: {
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          tokenExpiresAt: tokens.expiryDate ? new Date(tokens.expiryDate) : null,
          rootFolderId,
          domainFolderIds,
          syncStatus: 'synced',
          syncEnabled: true,
          updatedAt: new Date(),
        },
      });
  }

  /**
   * Sync a document to Google Drive
   */
  async syncDocumentToDrive(documentId: string): Promise<void> {
    const doc = await this.db
      .select()
      .from(indexDocuments)
      .where(eq(indexDocuments.id, documentId))
      .limit(1);

    if (doc.length === 0) {
      throw new Error(`Document not found: ${documentId}`);
    }

    const document = doc[0];

    // Get user's drive config
    const config = await this.db
      .select()
      .from(userDriveConfigs)
      .where(eq(userDriveConfigs.userId, document.userId))
      .limit(1);

    if (config.length === 0 || !config[0].syncEnabled) {
      return; // Drive not configured or sync disabled
    }

    const driveConfig = config[0];
    const tokens: UserDriveTokens = {
      accessToken: driveConfig.accessToken!,
      refreshToken: driveConfig.refreshToken!,
      expiryDate: driveConfig.tokenExpiresAt?.getTime(),
    };

    const driveService = createDriveService(tokens);
    const domainFolderIds = driveConfig.domainFolderIds as Record<string, string>;
    const { domain } = parseIndexCode(document.indexCode as IndexCode);
    const folderId = domainFolderIds[domain];

    if (!folderId) {
      throw new Error(`Domain folder not found for ${domain}`);
    }

    // Sync to Drive
    const { fileId, webViewLink } = await driveService.upsertDocument(
      {
        ...document,
        keyInsights: (document.keyInsights as string[]) || [],
        patterns: (document.patterns as string[]) || [],
        recommendations: (document.recommendations as string[]) || [],
        sourceMemoryIds: (document.sourceMemoryIds as string[]) || [],
        lastUpdatedAt: document.updatedAt,
      } as IndexDocument,
      folderId
    );

    // Update document with Drive info
    await this.db
      .update(indexDocuments)
      .set({
        driveFileId: fileId,
        driveFolderId: folderId,
        driveUrl: webViewLink,
        lastSyncedAt: new Date(),
      })
      .where(eq(indexDocuments.id, documentId));
  }

  /**
   * Sync all documents for a user
   */
  async syncAllDocuments(userId: string): Promise<{ synced: number; errors: string[] }> {
    const docs = await this.getUserDocuments(userId, { status: 'active' });

    let synced = 0;
    const errors: string[] = [];

    for (const doc of docs) {
      try {
        await this.syncDocumentToDrive(doc.id);
        synced++;
      } catch (error) {
        errors.push(`${doc.indexCode}: ${(error as Error).message}`);
      }
    }

    // Update sync status
    await this.db
      .update(userDriveConfigs)
      .set({
        lastFullSync: new Date(),
        syncStatus: errors.length === 0 ? 'synced' : 'error',
        syncErrors: errors,
        updatedAt: new Date(),
      })
      .where(eq(userDriveConfigs.userId, userId));

    return { synced, errors };
  }

  // ==========================================
  // Maintenance
  // ==========================================

  /**
   * Regenerate all stale documents for a user
   */
  async regenerateStaleDocuments(userId: string): Promise<IndexCode[]> {
    const docs = await this.db
      .select()
      .from(indexDocuments)
      .where(
        and(
          eq(indexDocuments.userId, userId),
          eq(indexDocuments.needsRegeneration, true)
        )
      );

    const regenerated: IndexCode[] = [];

    for (const doc of docs) {
      try {
        await this.regenerateDocument(userId, doc.indexCode as IndexCode, true);
        regenerated.push(doc.indexCode as IndexCode);
      } catch (error) {
        console.error(`Failed to regenerate ${doc.indexCode}:`, error);
      }
    }

    return regenerated;
  }

  /**
   * Get index coverage statistics for a user
   */
  async getIndexStats(userId: string): Promise<{
    totalDocuments: number;
    activeDocuments: number;
    totalMemoriesIndexed: number;
    domainCoverage: Record<IndexDomain, { count: number; avgConfidence: number }>;
    staleDocuments: number;
    driveEnabled: boolean;
  }> {
    const docs = await this.getUserDocuments(userId);

    const domainCoverage: Record<string, { count: number; totalConfidence: number }> = {};
    let totalMemories = 0;
    let staleCount = 0;

    for (const doc of docs) {
      const domain = doc.domain as IndexDomain;
      if (!domainCoverage[domain]) {
        domainCoverage[domain] = { count: 0, totalConfidence: 0 };
      }
      domainCoverage[domain].count++;
      domainCoverage[domain].totalConfidence += doc.confidence || 0;
      totalMemories += doc.memoryCount || 0;
      if (doc.needsRegeneration) staleCount++;
    }

    const driveConfig = await this.db
      .select()
      .from(userDriveConfigs)
      .where(eq(userDriveConfigs.userId, userId))
      .limit(1);

    // Calculate averages
    const coverageWithAvg: Record<string, { count: number; avgConfidence: number }> = {};
    for (const [domain, data] of Object.entries(domainCoverage)) {
      coverageWithAvg[domain] = {
        count: data.count,
        avgConfidence: data.count > 0 ? data.totalConfidence / data.count : 0,
      };
    }

    return {
      totalDocuments: docs.length,
      activeDocuments: docs.filter((d) => d.status === 'active').length,
      totalMemoriesIndexed: totalMemories,
      domainCoverage: coverageWithAvg as Record<IndexDomain, { count: number; avgConfidence: number }>,
      staleDocuments: staleCount,
      driveEnabled: driveConfig.length > 0 && driveConfig[0].syncEnabled,
    };
  }
}
