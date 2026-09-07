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

export type PublicUser = Omit<RawUser, 'password_hash'>;

@Injectable()
export class UserService {
  private readonly usersFilePath = join(
    __dirname,
    '..',
    'google-sheets',
    'user.json',
  );

  async findAll(): Promise<RawUser[]> {
    const raw = await readFile(this.usersFilePath, 'utf-8');
    return JSON.parse(raw) as RawUser[];
  }

  async findAllPublic(): Promise<PublicUser[]> {
    const users = await this.findAll();
    return users.map(({ password_hash: _password_hash, ...publicUser }) => publicUser);
  }

  async findByUsername(username: string): Promise<RawUser | null> {
    const users = await this.findAll();
    const user = users.find((u) => u.username === username);
    return user ?? null;
  }
}
