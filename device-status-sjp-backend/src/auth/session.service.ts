import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';

@Injectable()
export class SessionService {
  private readonly sessions = new Set<string>();

  create(): string {
    const token = randomUUID();
    this.sessions.add(token);
    return token;
  }

  revoke(token: string): void {
    this.sessions.delete(token);
  }

  isValid(token: string): boolean {
    return this.sessions.has(token);
  }
}
