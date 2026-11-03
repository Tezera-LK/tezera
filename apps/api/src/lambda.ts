import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import type { Handler } from 'aws-lambda';
import { AppModule } from './app.module';

// Lambda entry point. main.ts stays the entry for local dev (`pnpm dev`).
// The Nest app is created once per Lambda instance and reused by later requests.
let server: Handler | undefined;

async function bootstrap(): Promise<Handler> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  await app.init();
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() });
}

export const handler: Handler = async (event, context, callback) => {
  server ??= await bootstrap();
  return server(event, context, callback);
};
