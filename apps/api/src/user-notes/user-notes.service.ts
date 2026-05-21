import { Inject, Injectable, Logger, PayloadTooLargeException } from "@nestjs/common";
import { StoragePort } from "@study-note/storage";

const MAX_BODY_BYTES = 256 * 1024; // 256KB hard cap per object — plan §8b.4

export interface UserNoteRecord {
  body: string;
  updatedAt: string;
}

export interface UserNoteListItem {
  weekId: string;
  body: string;
  updatedAt: string;
}

export interface UserNotesListPage {
  items: UserNoteListItem[];
  nextCursor: string | null;
}

@Injectable()
export class UserNotesService {
  private readonly logger = new Logger("user-notes");

  constructor(@Inject(StoragePort) private readonly storage: StoragePort) {}

  /** R2 key — `notes/{userId}/week-{weekId}.json`. */
  private key(userId: string, weekId: string): string {
    return `notes/${encodeURIComponent(userId)}/week-${encodeURIComponent(weekId)}.json`;
  }

  private prefix(userId: string): string {
    return `notes/${encodeURIComponent(userId)}/`;
  }

  async getNote(userId: string, weekId: string): Promise<UserNoteRecord | null> {
    return this.storage.getJsonObject<UserNoteRecord>(this.key(userId, weekId));
  }

  async putNote(
    userId: string,
    weekId: string,
    body: string
  ): Promise<UserNoteRecord> {
    // plan §8b.4 — server-side payload cap. Body length in bytes (UTF-8).
    const byteLength = Buffer.byteLength(body, "utf-8");
    if (byteLength > MAX_BODY_BYTES) {
      throw new PayloadTooLargeException({
        errorCode: "PAYLOAD_TOO_LARGE",
        errorMessage: `userNotes body exceeds ${MAX_BODY_BYTES} bytes`
      });
    }
    const record: UserNoteRecord = {
      body,
      updatedAt: new Date().toISOString()
    };
    await this.storage.putJsonObject(this.key(userId, weekId), record);
    this.logger.log(`user-notes.put userId=${userId} weekId=${weekId} bytes=${byteLength}`);
    return record;
  }

  /**
   * Bulk listing — opt-in path (plan §8b.3). Server returns up to maxKeys
   * objects per page; client decides whether to continue with cursor.
   */
  async listNotes(
    userId: string,
    cursor?: string
  ): Promise<UserNotesListPage> {
    const listing = await this.storage.listJsonObjects(this.prefix(userId), {
      cursor,
      maxKeys: 50
    });
    const items: UserNoteListItem[] = [];
    for (const key of listing.keys) {
      const record = await this.storage.getJsonObject<UserNoteRecord>(key);
      if (record) {
        const weekId = extractWeekIdFromKey(key);
        if (weekId) {
          items.push({ weekId, ...record });
        }
      }
    }
    return { items, nextCursor: listing.nextCursor };
  }
}

function extractWeekIdFromKey(key: string): string | null {
  // key format: notes/{userIdEncoded}/week-{weekIdEncoded}.json
  const match = /\/week-([^/]+)\.json$/.exec(key);
  const raw = match?.[1];
  if (!raw) {
    return null;
  }
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
