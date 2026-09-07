import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:4200';
  app.enableCors({ origin: frontendOrigin });

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port);

  console.log(`Backend running at http://localhost:${port}`);

  console.log(`Auth API: http://localhost:${port}/auth/login`);
  console.log(`Users API: http://localhost:${port}/user`);
  console.log(`Google Sheets API: http://localhost:${port}/google-sheets`);
  console.log(`Users: http://localhost:${port}/google-sheets/users`);
  console.log(`Nodes: http://localhost:${port}/google-sheets/nodes`);
  console.log(`Devices: http://localhost:${port}/google-sheets/devices`);
  console.log(`Projects: http://localhost:${port}/google-sheets/projects`);
}

bootstrap().catch((error: unknown) => {
  console.error('Backend failed to start:', error);
  process.exitCode = 1;
});
