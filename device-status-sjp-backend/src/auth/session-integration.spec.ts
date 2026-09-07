import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { hash } from 'bcryptjs';
import { AppModule } from '../app.module';
import { UserService } from '../user/user.service';
import { GoogleSheetsService } from '../google-sheets/google-sheets-service';
import { DeviceStatusService } from '../device-status/device-status.service';
import { SessionService } from './session.service';

jest.mock('../google-sheets/google-sheets', () => ({
  __esModule: true,
  default: jest.fn(),
}));

const PROTECTED_ROUTES = [
  '/google-sheets/nodes', '/google-sheets/projects',
  '/google-sheets/devices', '/device-status/devices', '/user',
];
const TEST_PASSWORD = 'test-password-only';

describe('Login session across application modules', () => {
  let app: INestApplication;
  let baseUrl: string;
  let token: string;

  beforeAll(async () => {
    const user = {
      uuid: 'test-user', username: 'test-user', email: 'test@example.test',
      created_at: '2026-01-01', password_hash: await hash(TEST_PASSWORD, 4),
    };
    const module = await Test.createTestingModule({ imports: [AppModule] })
      .overrideProvider(UserService).useValue({
        findByUsername: async (username: string) => username === user.username ? user : null,
        findAllPublic: async () => [],
      })
      .overrideProvider(GoogleSheetsService).useValue({ findAll: async () => [] })
      .overrideProvider(DeviceStatusService).useValue({ getDevices: async () => [] })
      .compile();
    app = module.createNestApplication();
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
    const sessions = app.get(SessionService);
    const create = sessions.create.bind(sessions);
    jest.spyOn(sessions, 'create').mockImplementation(() => {
      token = create();
      return token;
    });
    const response = await fetch(baseUrl + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: user.username, password: TEST_PASSWORD }),
    });
    expect(response.status).toBe(201);
    const payload: unknown = await response.json();
    expect(payload).toMatchObject({ token });
  });

  afterAll(async () => { await app?.close(); jest.restoreAllMocks(); });

  it.each(PROTECTED_ROUTES)('accepts the login token at %s', async (route) => {
    const response = await fetch(baseUrl + route, {
      headers: { Authorization: 'Bearer ' + token },
    });
    expect(response.status).toBe(200);
  });

  it.each(PROTECTED_ROUTES)('rejects missing credentials at %s', async (route) => {
    expect((await fetch(baseUrl + route)).status).toBe(401);
  });

  it('rejects a revoked session across all modules', async () => {
    app.get(SessionService).revoke(token);
    for (const route of PROTECTED_ROUTES) {
      const response = await fetch(baseUrl + route, { headers: { Authorization: 'Bearer ' + token } });
      expect(response.status).toBe(401);
    }
  });
});
