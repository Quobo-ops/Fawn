/**
 * Google Drive Integration Service
 *
 * Manages the hierarchical folder structure and document storage in Google Drive.
 * Each user gets a root folder with domain subfolders (A-J) containing their
 * synthesized index documents.
 *
 * Folder Structure:
 * Fawn - {User Name}/
 *   ├── A - Identity & Core Self/
 *   │   ├── A001 - Core Values.gdoc
 *   │   ├── A002 - Personality Traits.gdoc
 *   │   └── ...
 *   ├── B - Relationships & Social/
 *   │   └── ...
 *   └── ...
 */

import { google, drive_v3 } from 'googleapis';
import type { IndexCode, IndexDocument, IndexDomain, DriveSyncStatus } from './types';
import { DOMAINS, getCategoryByCode } from './categories';

// OAuth2 scopes needed for Drive access
const SCOPES = [
  'https://www.googleapis.com/auth/drive.file', // Manage files created by app
];

export interface DriveCredentials {
  clientId: string;
  clientSecret: string;
  redirectUri: string;
}

export interface UserDriveTokens {
  accessToken: string;
  refreshToken: string;
  expiryDate?: number;
}

export interface DriveConfig {
  credentials: DriveCredentials;
  userTokens: UserDriveTokens;
}

export class DriveService {
  private drive: drive_v3.Drive;
  private auth: any;

  constructor(config: DriveConfig) {
    const { credentials, userTokens } = config;

    this.auth = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    this.auth.setCredentials({
      access_token: userTokens.accessToken,
      refresh_token: userTokens.refreshToken,
      expiry_date: userTokens.expiryDate,
    });

    this.drive = google.drive({ version: 'v3', auth: this.auth });
  }

  /**
   * Generate OAuth URL for user authorization
   */
  static getAuthUrl(credentials: DriveCredentials): string {
    const auth = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    return auth.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES,
      prompt: 'consent', // Force consent to get refresh token
    });
  }

  /**
   * Exchange authorization code for tokens
   */
  static async getTokensFromCode(
    credentials: DriveCredentials,
    code: string
  ): Promise<UserDriveTokens> {
    const auth = new google.auth.OAuth2(
      credentials.clientId,
      credentials.clientSecret,
      credentials.redirectUri
    );

    const { tokens } = await auth.getToken(code);

    if (!tokens.access_token || !tokens.refresh_token) {
      throw new Error('Failed to obtain access or refresh token');
    }

    return {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiryDate: tokens.expiry_date ?? undefined,
    };
  }

  /**
   * Initialize the folder structure for a user
   */
  async initializeUserFolders(userName: string): Promise<{
    rootFolderId: string;
    domainFolderIds: Record<IndexDomain, string>;
  }> {
    // Create root folder
    const rootFolder = await this.createFolder(`Fawn - ${userName}`);
    const rootFolderId = rootFolder.id!;

    // Create domain subfolders
    const domainFolderIds: Record<string, string> = {};

    for (const [domain, meta] of Object.entries(DOMAINS)) {
      const folderName = `${domain} - ${meta.name}`;
      const folder = await this.createFolder(folderName, rootFolderId);
      domainFolderIds[domain] = folder.id!;
    }

    return {
      rootFolderId,
      domainFolderIds: domainFolderIds as Record<IndexDomain, string>,
    };
  }

  /**
   * Create a folder in Google Drive
   */
  async createFolder(name: string, parentId?: string): Promise<drive_v3.Schema$File> {
    const fileMetadata: drive_v3.Schema$File = {
      name,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentId) {
      fileMetadata.parents = [parentId];
    }

    const response = await this.drive.files.create({
      requestBody: fileMetadata,
      fields: 'id, name, webViewLink',
    });

    return response.data;
  }

  /**
   * Create or update an index document in Google Drive
   */
  async upsertDocument(
    document: IndexDocument,
    domainFolderId: string
  ): Promise<{ fileId: string; webViewLink: string }> {
    const category = getCategoryByCode(document.indexCode);
    const fileName = `${document.indexCode} - ${category?.topicName || document.title}`;

    // Format document content as rich text
    const formattedContent = this.formatDocumentContent(document);

    if (document.driveFileId) {
      // Update existing document
      const response = await this.drive.files.update({
        fileId: document.driveFileId,
        requestBody: {
          name: fileName,
        },
        media: {
          mimeType: 'text/plain',
          body: formattedContent,
        },
        fields: 'id, webViewLink',
      });

      return {
        fileId: response.data.id!,
        webViewLink: response.data.webViewLink!,
      };
    } else {
      // Create new Google Doc
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          mimeType: 'application/vnd.google-apps.document',
          parents: [domainFolderId],
        },
        media: {
          mimeType: 'text/plain',
          body: formattedContent,
        },
        fields: 'id, webViewLink',
      });

      return {
        fileId: response.data.id!,
        webViewLink: response.data.webViewLink!,
      };
    }
  }

  /**
   * Format document content for Google Docs
   */
  private formatDocumentContent(document: IndexDocument): string {
    const category = getCategoryByCode(document.indexCode);
    const lines: string[] = [];

    // Title section
    lines.push(`${document.title}`);
    lines.push(`Index: ${document.indexCode} | ${category?.domainName} > ${category?.topicName}`);
    lines.push(`Last Updated: ${document.lastUpdatedAt.toISOString()}`);
    lines.push(`Confidence: ${Math.round(document.confidence * 100)}%`);
    lines.push('');
    lines.push('═'.repeat(60));
    lines.push('');

    // Summary
    lines.push('SUMMARY');
    lines.push('─'.repeat(40));
    lines.push(document.summary);
    lines.push('');

    // Main content - the deep dive
    lines.push('DEEP DIVE');
    lines.push('─'.repeat(40));
    lines.push(document.content);
    lines.push('');

    // Key insights
    if (document.keyInsights.length > 0) {
      lines.push('KEY INSIGHTS');
      lines.push('─'.repeat(40));
      document.keyInsights.forEach((insight, i) => {
        lines.push(`${i + 1}. ${insight}`);
      });
      lines.push('');
    }

    // Patterns observed
    if (document.patterns.length > 0) {
      lines.push('PATTERNS OBSERVED');
      lines.push('─'.repeat(40));
      document.patterns.forEach((pattern) => {
        lines.push(`• ${pattern}`);
      });
      lines.push('');
    }

    // Recommendations for companion
    if (document.recommendations.length > 0) {
      lines.push('COMPANION GUIDELINES');
      lines.push('─'.repeat(40));
      document.recommendations.forEach((rec) => {
        lines.push(`→ ${rec}`);
      });
      lines.push('');
    }

    // Metadata
    lines.push('');
    lines.push('─'.repeat(60));
    lines.push(`Based on ${document.memoryCount} memories | Version ${document.version}`);
    lines.push(`Status: ${document.status}`);

    return lines.join('\n');
  }

  /**
   * Read document content from Google Drive
   */
  async getDocumentContent(fileId: string): Promise<string> {
    const response = await this.drive.files.export({
      fileId,
      mimeType: 'text/plain',
    });

    return response.data as string;
  }

  /**
   * Delete a document from Google Drive
   */
  async deleteDocument(fileId: string): Promise<void> {
    await this.drive.files.delete({
      fileId,
    });
  }

  /**
   * List all documents in a folder
   */
  async listDocuments(folderId: string): Promise<drive_v3.Schema$File[]> {
    const response = await this.drive.files.list({
      q: `'${folderId}' in parents and trashed = false`,
      fields: 'files(id, name, modifiedTime, webViewLink)',
      orderBy: 'name',
    });

    return response.data.files || [];
  }

  /**
   * Get metadata for a specific file
   */
  async getFileMetadata(fileId: string): Promise<drive_v3.Schema$File> {
    const response = await this.drive.files.get({
      fileId,
      fields: 'id, name, modifiedTime, webViewLink, size',
    });

    return response.data;
  }

  /**
   * Check if folder structure exists and is valid
   */
  async validateFolderStructure(rootFolderId: string): Promise<boolean> {
    try {
      const files = await this.listDocuments(rootFolderId);
      const folderNames = files
        .filter((f) => f.name)
        .map((f) => f.name!.charAt(0));

      // Check that all domain folders exist
      const domains = Object.keys(DOMAINS);
      return domains.every((d) => folderNames.includes(d));
    } catch {
      return false;
    }
  }

  /**
   * Share folder with a user (for backup access)
   */
  async shareFolder(
    folderId: string,
    email: string,
    role: 'reader' | 'writer' = 'reader'
  ): Promise<void> {
    await this.drive.permissions.create({
      fileId: folderId,
      requestBody: {
        type: 'user',
        role,
        emailAddress: email,
      },
    });
  }

  /**
   * Refresh access token if needed
   */
  async refreshTokenIfNeeded(): Promise<UserDriveTokens | null> {
    try {
      const { credentials } = await this.auth.refreshAccessToken();
      if (credentials.access_token) {
        return {
          accessToken: credentials.access_token,
          refreshToken: credentials.refresh_token || '',
          expiryDate: credentials.expiry_date,
        };
      }
    } catch (error) {
      console.error('Failed to refresh Drive token:', error);
    }
    return null;
  }
}

/**
 * Factory function to create DriveService from environment/config
 */
export function createDriveService(userTokens: UserDriveTokens): DriveService {
  const credentials: DriveCredentials = {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3000/auth/google/callback',
  };

  if (!credentials.clientId || !credentials.clientSecret) {
    throw new Error('Google Drive credentials not configured');
  }

  return new DriveService({
    credentials,
    userTokens,
  });
}
