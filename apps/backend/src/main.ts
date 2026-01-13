/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { CompanyContextInterceptor } from './common/interceptors/company-context.interceptor';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Logger } from '@nestjs/common';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  process.env.TZ = 'America/Santiago';

  // Configurar WebSocket Adapter
  app.useWebSocketAdapter(new IoAdapter(app));

  // Configuración de CORS mejorada

  app.enableCors({
    origin: (origin, cb) => {
      const allow = new Set([
        process.env.AUTH_FRONT_URL,
        'https://frontend-production-e71a.up.railway.app',
        'https://frontend-staging-da95.up.railway.app',
        'https://really-front-prod.up.railway.app',
        'https://app.really.cl',
        'https://dev.really.cl',
        'http://localhost:5173',
        'https://localhost:5173',
        'http://localhost:5174',
        'https://localhost:5174',
        'http://localhost:3000',
        'https://2b373daf2527.ngrok-free.app',
        'https://60119a2e5deb.ngrok-free.app',
        'https://25889fa065fd.ngrok-free.app',
      ]);
      const ngrok = /^https:\/\/[a-z0-9-]+\.ngrok-free\.app$/i;

      // permitir herramientas tipo curl (sin Origin) y orígenes de la allowlist o ngrok
      if (!origin || allow.has(origin) || ngrok.test(origin)) {
        cb(null, origin ?? true);
      } else {
        logger.warn(`Origen no permitido: ${origin}`);
        cb(null, false);
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With', 'x-company-id'],
    preflightContinue: false,
    optionsSuccessStatus: 204,
  });



  // Configuración de Swagger
  const config = new DocumentBuilder()
    .setTitle('API Documentation')
    .setDescription('API description')
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true
  }));

  app.useGlobalInterceptors(new CompanyContextInterceptor());

  app.useGlobalFilters(new GlobalExceptionFilter());

  await app.listen(process.env.PORT ?? 3000);
  logger.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();


