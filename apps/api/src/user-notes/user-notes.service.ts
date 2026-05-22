import { Inject, Injectable, Logger, PayloadTooLargeException } from "@nestjs/common";
import { StoragePort } from "@study-note/storage";

const MAX_BODY_BYTES = 256 * 1024; // 256KB hard cap per object — plan §8b.4

export interface UserNoteRecord {
  body: string;
  updatedAt: string;
}

export interface UserNoteListItem {
  subjectId: string;
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

  /** R2 key — subject-scoped to avoid weekId collisions across subjects.
   *  Format: `notes/{userId}/subject-{subjectId}/week-{weekId}.json`. */
  private key(userId: string, subjectId: string, weekId: string): string {
    return `notes/${encodeURIComponent(userId)}/subject-${encodeURIComponent(subjectId)}/week-${encodeURIComponent(weekId)}.json`;
  }

  private prefix(userId: string): string {
    return `notes/${encodeURIComponent(userId)}/`;
  }

  async getNote(
    userId: string,
    subjectId: string,
    weekId: string
  ): Promise<UserNoteRecord | null> {
    return this.storage.getJsonObject<UserNoteRecord>(this.key(userId, subjectId, weekId));
  }

  async putNote(
    userId: string,
    subjectId: string,
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
    await this.storage.putJsonObject(this.key(userId, subjectId, weekId), record);
    this.logger.log(
      `user-notes.put userId=${userId} subjectId=${subjectId} weekId=${weekId} bytes=${byteLength}`
    );
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
        const parsed = extractSubjectWeekFromKey(key);
        if (parsed) {
          items.push({ ...parsed, ...record });
        }
      }
    }
    return { items, nextCursor: listing.nextCursor };
  }
}

function extractSubjectWeekFromKey(
  key: string
): { subjectId: string; weekId: string } | null {
  // key format: notes/{userIdEncoded}/subject-{subjectIdEncoded}/week-{weekIdEncoded}.json
  const match = /\/subject-([^/]+)\/week-([^/]+)\.json$/.exec(key);
  const subjectRaw = match?.[1];
  const weekRaw = match?.[2];
  if (!subjectRaw || !weekRaw) {
    return null;
  }
  const subjectId = decodeSafe(subjectRaw);
  const weekId = decodeSafe(weekRaw);
  return { subjectId, weekId };
}

function decodeSafe(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}
