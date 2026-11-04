import serverlessExpress from '@codegenie/serverless-express';
import { NestFactory } from '@nestjs/core';
import type { Context } from 'aws-lambda';
import { AppModule } from './app.module';

// Lambda entry point. main.ts stays the entry for local dev (`pnpm dev`).
// The Nest app is created once per Lambda instance and reused by later requests.

// Async handlers take (event, context) only. From Node.js 24, Lambda refuses to start a
// handler that declares a third `callback` parameter (Runtime.CallbackHandlerDeprecated).
// serverless-express v5's handler has this shape; its published type still includes the callback.
type AsyncHandler = (event: unknown, context: Context) => Promise<unknown>;

let server: AsyncHandler | undefined;

async function bootstrap(): Promise<AsyncHandler> {
  const app = await NestFactory.create(AppModule);
  app.enableCors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000' });
  await app.init();
  return serverlessExpress({ app: app.getHttpAdapter().getInstance() }) as unknown as AsyncHandler;
}

export const handler: AsyncHandler = async (event, context) => {
  server ??= await bootstrap();
  return server(event, context);
};
