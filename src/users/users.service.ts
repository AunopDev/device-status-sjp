import { Injectable } from '@nestjs/common';

import usersData from './data/user.json';

interface User {
  username: string;
}

const users: User[] = usersData;

@Injectable()
export class UsersService {
  findByUsername(username: string): User | undefined {
    return users.find((user) => user.username === username);
  }
}
