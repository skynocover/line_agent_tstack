import type { R2Bucket } from '@cloudflare/workers-types';
import { and, eq, sql } from 'drizzle-orm';
import type { Database } from '../db';
import type { Newfile } from '../db/schema';
import { files } from '../db/schema';
import type { GetUserFilesResponse } from '../types/api';

export class FileController {
  constructor(
    private db: Database,
    private storage: R2Bucket,
  ) {}

  async getUserFiles(
    userId: string,
    page: number,
    limit: number,
    sort?: string,
    order?: 'asc' | 'desc',
    filter?: string,
  ): Promise<GetUserFilesResponse> {
    const offset = (page - 1) * limit;

    const query = this.db.query.files.findMany({
      where: (files, { eq, and, like }) => {
        const conditions = [
          eq(files.userId, userId),
          sql`${files.groupId} IS NULL`, // 只顯示個人檔案（groupId 為 NULL）
        ];
        if (filter) {
          conditions.push(like(files.fileName, `%${filter}%`));
        }
        return and(...conditions);
      },
      limit,
      offset,
      orderBy: (files, { asc, desc }) => {
        if (sort === 'name') {
          return order === 'desc' ? [desc(files.fileName)] : [asc(files.fileName)];
        }
        if (sort === 'size') {
          return order === 'desc' ? [desc(files.fileSize)] : [asc(files.fileSize)];
        }
        if (sort === 'date') {
          return order === 'desc' ? [desc(files.createdAt)] : [asc(files.createdAt)];
        }
        if (sort === 'type') {
          return order === 'desc' ? [desc(files.mimeType)] : [asc(files.mimeType)];
        }
        return [desc(files.createdAt)];
      },
    });

    const userFiles = await query;

    const totalCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(and(eq(files.userId, userId), sql`${files.groupId} IS NULL`))
      .then((result) => result[0].count);

    return {
      data: userFiles,
      pagination: {
        total: totalCount,
        page,
        limit,
        totalPages: Math.ceil(totalCount / limit),
      },
    };
  }

  async getFile(fileId: string): Promise<typeof files.$inferSelect | undefined> {
    return await this.db.query.files.findFirst({
      where: (files, { eq }) => eq(files.fileId, fileId),
    });
  }

  async createFile(fileData: Newfile, fileBuffer: ArrayBuffer): Promise<typeof files.$inferSelect> {
    const [file] = await this.db.insert(files).values(fileData).returning();

    // Determine storage path based on whether it's a group file
    const storagePath = fileData.groupId
      ? `groups/${fileData.groupId}/${fileData.fileId}`
      : `users/${fileData.userId}/${fileData.fileId}`;

    await this.storage.put(storagePath, fileBuffer, {
      httpMetadata: {
        contentType: fileData.mimeType,
        contentDisposition: `inline; filename="${fileData.fileId}"`,
      },
    });

    return file;
  }

  async deleteFile(fileId: string, userId: string): Promise<boolean> {
    const file = await this.getFile(fileId);
    if (!file || file.userId !== userId || file.groupId) {
      return false; // 不允許刪除群組檔案
    }

    // Determine storage path for deletion
    const storagePath = `users/${userId}/${fileId}`;

    await this.db.delete(files).where(eq(files.fileId, fileId));
    await this.storage.delete(storagePath);

    return true;
  }

  async updateFileName(
    fileId: string,
    userId: string,
    newFileName: string,
  ): Promise<typeof files.$inferSelect | null> {
    const file = await this.getFile(fileId);
    if (!file || file.userId !== userId || file.groupId) {
      return null; // 不允許修改群組檔案名稱
    }

    const [updatedFile] = await this.db
      .update(files)
      .set({ fileName: newFileName })
      .where(eq(files.fileId, fileId))
      .returning();

    return updatedFile;
  }

  async getFileContent(userId: string, fileId: string): Promise<ArrayBuffer | null> {
    try {
      // Get file info to determine storage path
      const file = await this.getFile(fileId);
      if (!file || file.userId !== userId || file.groupId) {
        return null; // 不允許取得群組檔案內容（通過個人 API）
      }

      const storagePath = `users/${userId}/${fileId}`;

      const object = await this.storage.get(storagePath);
      if (!object) {
        return null;
      }
      return await object.arrayBuffer();
    } catch (error) {
      console.error('Error getting file content:', error);
      return null;
    }
  }

  // Get group files
  async getGroupFiles(
    groupId: string,
    page: number,
    limit: number,
    sort?: string,
    order?: 'asc' | 'desc',
    filter?: string,
  ): Promise<GetUserFilesResponse> {
    const offset = (page - 1) * limit;

    const query = this.db.query.files.findMany({
      where: (files, { eq, and, like }) => {
        const conditions = [eq(files.groupId, groupId)];
        if (filter) {
          conditions.push(like(files.fileName, `%${filter}%`));
        }
        return and(...conditions);
      },
      limit,
      offset,
      orderBy: (files, { asc, desc }) => {
        if (sort === 'name') {
          return order === 'desc' ? [desc(files.fileName)] : [asc(files.fileName)];
        }
        if (sort === 'size') {
          return order === 'desc' ? [desc(files.fileSize)] : [asc(files.fileSize)];
        }
        if (sort === 'date') {
          return order === 'desc' ? [desc(files.createdAt)] : [asc(files.createdAt)];
        }
        if (sort === 'type') {
          return order === 'desc' ? [desc(files.mimeType)] : [asc(files.mimeType)];
        }
        return [desc(files.createdAt)];
      },
    });

    const foundFiles = await query;

    // Get total count for pagination
    const totalCount = await this.db
      .select({ count: sql<number>`count(*)` })
      .from(files)
      .where(eq(files.groupId, groupId));

    return {
      data: foundFiles,
      pagination: {
        total: totalCount[0].count,
        page,
        limit,
        totalPages: Math.ceil(totalCount[0].count / limit),
      },
    };
  }

  // 群組檔案管理方法
  async updateGroupFileName(
    fileId: string,
    groupId: string,
    newFileName: string,
  ): Promise<typeof files.$inferSelect | null> {
    const file = await this.getFile(fileId);
    if (!file || file.groupId !== groupId) {
      return null; // 只允許修改對應群組的群組檔案
    }

    const [updatedFile] = await this.db
      .update(files)
      .set({ fileName: newFileName })
      .where(eq(files.fileId, fileId))
      .returning();

    return updatedFile;
  }

  async deleteGroupFile(fileId: string, groupId: string): Promise<boolean> {
    const file = await this.getFile(fileId);
    if (!file || file.groupId !== groupId) {
      return false; // 只允許刪除對應群組的群組檔案
    }

    const storagePath = `groups/${groupId}/${fileId}`;

    await this.db.delete(files).where(eq(files.fileId, fileId));
    await this.storage.delete(storagePath);

    return true;
  }

  async getGroupFileContent(groupId: string, fileId: string): Promise<ArrayBuffer | null> {
    try {
      const file = await this.getFile(fileId);
      if (!file || file.groupId !== groupId) {
        return null; // 只允許取得對應群組的群組檔案
      }

      const storagePath = `groups/${groupId}/${fileId}`;

      const object = await this.storage.get(storagePath);
      if (!object) {
        return null;
      }
      return await object.arrayBuffer();
    } catch (error) {
      console.error('Error getting group file content:', error);
      return null;
    }
  }
}
