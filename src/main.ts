import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableCors();

  const port = Number(process.env.PORT) || 3000;

  await app.listen(port);

  console.log(`Backend running at http://localhost:${port}`);
  console.log(`Nodes API: http://localhost:${port}/nodes`);
  console.log(`Devices API: http://localhost:${port}/devices`);
  console.log(`Projects API: http://localhost:${port}/projects`);
  console.log(`Users API: http://localhost:${port}/users`);
}

bootstrap().catch((error: unknown) => {
  console.error('Backend failed to start:', error);
  process.exitCode = 1;
});
