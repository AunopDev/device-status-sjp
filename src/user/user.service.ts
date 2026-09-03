import { Injectable } from '@nestjs/common';
import { readFile } from 'fs/promises';
import { join } from 'path';

interface RawUser {
  uuid: string;
  username: string;
  email: string;
  password_hash: string;
  created_at: string;
}

@Injectable()
export class UserService {
  private readonly usersFilePath = join(
    __dirname,
    '..',
    'google-sheets-data',
    'user.json',
  );

  async findAll(): Promise<RawUser[]> {
    const raw = await readFile(this.usersFilePath, 'utf-8');
    return JSON.parse(raw) as RawUser[];
  }

  async findByUsername(username: string): Promise<RawUser | null> {
    const users = await this.findAll();
    const user = users.find((u) => u.username === username);
    return user ?? null;
  }
}
