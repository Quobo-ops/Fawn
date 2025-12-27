import { Router } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import {
  db,
  indexDocuments,
  userDriveConfigs,
  searchIndexDocumentsByEmbedding,
  getIndexDocumentsByDomain,
  getConversationContext,
} from '@fawn/database';
import { generateEmbedding } from '@fawn/ai';
import {
  IndexManager,
  DOMAINS,
  CATEGORIES,
  getCategoryByCode,
  getCategoriesByDomain,
  DriveService,
  type IndexCode,
  type IndexDomain,
} from '@fawn/indexing';
import { eq, and, desc } from 'drizzle-orm';

export const indexingRouter = Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';

function getUserIdFromAuth(authHeader: string | undefined): string | null {
  if (!authHeader?.startsWith('Bearer ')) return null;
  try {
    const token = authHeader.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET) as { userId: string };
    return decoded.userId;
  } catch {
    return null;
  }
}

const indexManager = new IndexManager(db);

// ============================================
// Category & Schema Endpoints
// ============================================

/**
 * Get all available index domains and categories
 */
indexingRouter.get('/schema', async (_req, res) => {
  res.json({
    domains: Object.entries(DOMAINS).map(([code, meta]) => ({
      code,
      ...meta,
    })),
    categories: CATEGORIES.map((cat) => ({
      code: cat.code,
      domain: cat.domain,
      domainName: cat.domainName,
      topicName: cat.topicName,
      description: cat.description,
      priority: cat.priority,
    })),
  });
});

/**
 * Get categories for a specific domain
 */
indexingRouter.get('/schema/:domain', async (req, res) => {
  const domain = req.params.domain.toUpperCase() as IndexDomain;

  if (!DOMAINS[domain]) {
    res.status(404).json({ error: 'Invalid domain' });
    return;
  }

  const categories = getCategoriesByDomain(domain);

  res.json({
    domain: {
      code: domain,
      ...DOMAINS[domain],
    },
    categories: categories.map((cat) => ({
      code: cat.code,
      topicName: cat.topicName,
      description: cat.description,
      priority: cat.priority,
    })),
  });
});

// ============================================
// Document Endpoints
// ============================================

/**
 * Get all index documents for the user
 */
indexingRouter.get('/documents', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const domain = req.query.domain as IndexDomain | undefined;
  const status = req.query.status as string | undefined;

  try {
    const documents = await indexManager.getUserDocuments(userId, {
      domain,
      status,
    });

    res.json({
      documents: documents.map((doc) => ({
        id: doc.id,
        indexCode: doc.indexCode,
        domain: doc.domain,
        title: doc.title,
        summary: doc.summary,
        confidence: doc.confidence,
        memoryCount: doc.memoryCount,
        status: doc.status,
        driveUrl: doc.driveUrl,
        updatedAt: doc.updatedAt,
      })),
    });
  } catch (error) {
    console.error('Get documents error:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

/**
 * Get a specific index document with full content
 */
indexingRouter.get('/documents/:indexCode', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const indexCode = req.params.indexCode.toUpperCase() as IndexCode;
  const category = getCategoryByCode(indexCode);

  if (!category) {
    res.status(404).json({ error: 'Invalid index code' });
    return;
  }

  try {
    const doc = await indexManager.getOrCreateDocument(userId, indexCode);

    res.json({
      document: {
        id: doc.id,
        indexCode: doc.indexCode,
        domain: doc.domain,
        domainName: category.domainName,
        topicName: category.topicName,
        title: doc.title,
        summary: doc.summary,
        content: doc.content,
        keyInsights: doc.keyInsights,
        patterns: doc.patterns,
        recommendations: doc.recommendations,
        confidence: doc.confidence,
        memoryCount: doc.memoryCount,
        sourceMemoryIds: doc.sourceMemoryIds,
        status: doc.status,
        needsRegeneration: doc.needsRegeneration,
        driveUrl: doc.driveUrl,
        lastSyncedAt: doc.lastSyncedAt,
        updatedAt: doc.updatedAt,
        version: doc.version,
      },
    });
  } catch (error) {
    console.error('Get document error:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

/**
 * Regenerate a document's content from its source memories
 */
indexingRouter.post('/documents/:indexCode/regenerate', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const indexCode = req.params.indexCode.toUpperCase() as IndexCode;
  const category = getCategoryByCode(indexCode);

  if (!category) {
    res.status(404).json({ error: 'Invalid index code' });
    return;
  }

  try {
    const doc = await indexManager.regenerateDocument(userId, indexCode, true);

    res.json({
      success: true,
      document: {
        id: doc.id,
        indexCode: doc.indexCode,
        title: doc.title,
        summary: doc.summary,
        confidence: doc.confidence,
        memoryCount: doc.memoryCount,
        version: doc.version,
        updatedAt: doc.updatedAt,
      },
    });
  } catch (error) {
    console.error('Regenerate document error:', error);
    res.status(500).json({ error: 'Failed to regenerate document' });
  }
});

/**
 * Regenerate all stale documents
 */
indexingRouter.post('/documents/regenerate-stale', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const regenerated = await indexManager.regenerateStaleDocuments(userId);

    res.json({
      success: true,
      regeneratedCount: regenerated.length,
      regeneratedCodes: regenerated,
    });
  } catch (error) {
    console.error('Regenerate stale error:', error);
    res.status(500).json({ error: 'Failed to regenerate documents' });
  }
});

// ============================================
// Context Retrieval Endpoints
// ============================================

/**
 * Search index documents semantically
 */
indexingRouter.get('/search', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const query = req.query.q as string;
  if (!query) {
    res.status(400).json({ error: 'Query parameter "q" is required' });
    return;
  }

  const limit = Math.min(parseInt(req.query.limit as string) || 5, 20);

  try {
    const queryEmbedding = await generateEmbedding(query);
    const results = await searchIndexDocumentsByEmbedding(userId, queryEmbedding, limit, 0.3);

    res.json({
      query,
      results: results.map((r: any) => ({
        indexCode: r.index_code,
        domain: r.domain,
        title: r.title,
        summary: r.summary,
        similarity: r.similarity,
        confidence: r.confidence,
      })),
    });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

/**
 * Get context package for conversation preparation
 */
indexingRouter.post('/context', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const contextSchema = z.object({
    query: z.string().optional(),
    indexCodes: z.array(z.string()).optional(),
    domains: z.array(z.string()).optional(),
    maxDocuments: z.number().min(1).max(10).optional(),
    includeRelated: z.boolean().optional(),
  });

  try {
    const data = contextSchema.parse(req.body);

    const contextPackage = await indexManager.retrieveContext({
      userId,
      query: data.query,
      indexCodes: data.indexCodes as IndexCode[],
      domains: data.domains as IndexDomain[],
      maxDocuments: data.maxDocuments,
      includeRelated: data.includeRelated,
    });

    res.json({
      context: {
        documentCount: contextPackage.documents.length,
        documents: contextPackage.documents.map((d) => ({
          indexCode: d.indexCode,
          title: d.title,
          summary: d.summary,
          keyInsights: d.keyInsights,
          recommendations: d.recommendations,
        })),
        formattedContext: contextPackage.formattedContext,
        retrievedAt: contextPackage.retrievedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Context retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve context' });
  }
});

/**
 * Get comprehensive conversation context (documents + memories)
 */
indexingRouter.post('/context/comprehensive', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const schema = z.object({
    message: z.string().min(1),
    maxDocuments: z.number().min(1).max(5).optional(),
    maxMemories: z.number().min(1).max(20).optional(),
    priorityDomains: z.array(z.string()).optional(),
  });

  try {
    const data = schema.parse(req.body);

    const queryEmbedding = await generateEmbedding(data.message);

    const context = await getConversationContext(userId, queryEmbedding, {
      maxDocuments: data.maxDocuments,
      maxMemories: data.maxMemories,
      priorityDomains: data.priorityDomains,
    });

    res.json({
      context: {
        indexDocuments: context.indexDocuments.map((d: any) => ({
          indexCode: d.index_code,
          domain: d.domain,
          title: d.title,
          summary: d.summary,
          keyInsights: d.key_insights,
          recommendations: d.recommendations,
          similarity: d.similarity,
        })),
        memories: context.memories.map((m: any) => ({
          id: m.id,
          content: m.content,
          category: m.category,
          importance: m.importance,
          primaryIndexCode: m.primary_index_code,
          relatedIndexCodes: m.related_index_codes,
          similarity: m.similarity,
        })),
        retrievedAt: context.retrievedAt,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Comprehensive context error:', error);
    res.status(500).json({ error: 'Failed to retrieve context' });
  }
});

// ============================================
// Memory Indexing Endpoints
// ============================================

/**
 * Index a specific memory (classify and map to documents)
 */
indexingRouter.post('/index-memory/:memoryId', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const memoryId = req.params.memoryId;

  const schema = z.object({
    content: z.string(),
    category: z.string(),
    importance: z.number().min(1).max(10).optional(),
    metadata: z.record(z.unknown()).optional(),
  });

  try {
    const data = schema.parse(req.body);

    const result = await indexManager.indexMemory(
      memoryId,
      userId,
      data.content,
      data.category,
      data.importance || 5,
      data.metadata
    );

    res.json({
      success: true,
      directive: {
        primaryIndex: result.directive.primaryIndexCode,
        relatedIndices: result.directive.relatedIndexCodes,
        confidence: result.directive.confidence,
      },
      affectedDocuments: result.affectedDocuments,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Index memory error:', error);
    res.status(500).json({ error: 'Failed to index memory' });
  }
});

// ============================================
// Google Drive Endpoints
// ============================================

/**
 * Get Drive connection status
 */
indexingRouter.get('/drive/status', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const config = await db
      .select()
      .from(userDriveConfigs)
      .where(eq(userDriveConfigs.userId, userId))
      .limit(1);

    if (config.length === 0) {
      res.json({
        connected: false,
        syncEnabled: false,
      });
      return;
    }

    const c = config[0];

    res.json({
      connected: true,
      syncEnabled: c.syncEnabled,
      syncStatus: c.syncStatus,
      lastFullSync: c.lastFullSync,
      lastIncrementalSync: c.lastIncrementalSync,
      errors: c.syncErrors,
    });
  } catch (error) {
    console.error('Drive status error:', error);
    res.status(500).json({ error: 'Failed to get Drive status' });
  }
});

/**
 * Get OAuth URL for Google Drive connection
 */
indexingRouter.get('/drive/auth-url', async (req, res) => {
  const credentials = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
  };

  if (!credentials.clientId || !credentials.clientSecret) {
    res.status(503).json({ error: 'Google Drive not configured' });
    return;
  }

  const authUrl = DriveService.getAuthUrl(credentials);

  res.json({ authUrl });
});

/**
 * Complete OAuth flow and initialize Drive
 */
indexingRouter.post('/drive/connect', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const schema = z.object({
    code: z.string(),
    userName: z.string(),
  });

  try {
    const data = schema.parse(req.body);

    const credentials = {
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
      redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
    };

    if (!credentials.clientId || !credentials.clientSecret) {
      res.status(503).json({ error: 'Google Drive not configured' });
      return;
    }

    // Exchange code for tokens
    const tokens = await DriveService.getTokensFromCode(credentials, data.code);

    // Initialize Drive structure
    await indexManager.initializeDrive(userId, data.userName, tokens);

    res.json({ success: true, message: 'Google Drive connected successfully' });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation failed', details: error.errors });
      return;
    }
    console.error('Drive connect error:', error);
    res.status(500).json({ error: 'Failed to connect Google Drive' });
  }
});

/**
 * Sync a document to Google Drive
 */
indexingRouter.post('/drive/sync/:indexCode', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  const indexCode = req.params.indexCode.toUpperCase() as IndexCode;

  try {
    // Get document ID
    const doc = await db
      .select()
      .from(indexDocuments)
      .where(and(eq(indexDocuments.userId, userId), eq(indexDocuments.indexCode, indexCode)))
      .limit(1);

    if (doc.length === 0) {
      res.status(404).json({ error: 'Document not found' });
      return;
    }

    await indexManager.syncDocumentToDrive(doc[0].id);

    res.json({ success: true });
  } catch (error) {
    console.error('Sync error:', error);
    res.status(500).json({ error: 'Failed to sync document' });
  }
});

/**
 * Sync all documents to Google Drive
 */
indexingRouter.post('/drive/sync-all', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const result = await indexManager.syncAllDocuments(userId);

    res.json({
      success: result.errors.length === 0,
      synced: result.synced,
      errors: result.errors,
    });
  } catch (error) {
    console.error('Sync all error:', error);
    res.status(500).json({ error: 'Failed to sync documents' });
  }
});

// ============================================
// Stats Endpoint
// ============================================

/**
 * Get indexing statistics
 */
indexingRouter.get('/stats', async (req, res) => {
  const userId = getUserIdFromAuth(req.headers.authorization);
  if (!userId) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }

  try {
    const stats = await indexManager.getIndexStats(userId);

    res.json({ stats });
  } catch (error) {
    console.error('Stats error:', error);
    res.status(500).json({ error: 'Failed to get stats' });
  }
});
