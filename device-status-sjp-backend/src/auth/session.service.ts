import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

const SESSION_DURATION_MS = 30 * 60 * 1000;

@Injectable()
export class SessionService {
  private readonly sessions = new Map<string, number>();

  create(): string {
    const token = randomUUID();
    this.sessions.set(token, Date.now() + SESSION_DURATION_MS);
    return token;
  }

  revoke(token: string): void {
    this.sessions.delete(token);
  }

  isValid(token: string): boolean {
    const expiresAt = this.sessions.get(token);
    if (expiresAt === undefined) return false;
    if (Date.now() >= expiresAt) {
      this.sessions.delete(token);
      return false;
    }
    return true;
  }
}
