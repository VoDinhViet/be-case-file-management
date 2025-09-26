import {
  ClassSerializerInterceptor,
  HttpStatus,
  RequestMethod,
  UnprocessableEntityException,
  ValidationError,
  ValidationPipe,
  VersioningType,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory, Reflector } from '@nestjs/core';
import compression from 'compression';
import helmet from 'helmet';
import { AuthService } from './api/auth/auth.service';
import { AppModule } from './app.module';
import { AllConfigType } from './config/config.type';
import { Environment } from './constants/app.constant';
import { GlobalExceptionFilter } from './filters/global-exception.filter';
import { AuthGuard } from './guards/auth.guard';
import setupSwagger from './utils/setup-swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    bufferLogs: true,
  });
  // Setup security headers
  app.use(helmet());

  // For high-traffic websites in production, it is strongly recommended to offload compression from the application server - typically in a reverse proxy (e.g., Nginx). In that case, you should not use compression middleware.
  app.use(compression());
  const configService = app.get(ConfigService<AllConfigType>);
  const isProduction =
    configService.get('app.nodeEnv', { infer: true }) ===
    Environment.PRODUCTION;
  const reflector = app.get(Reflector);
  // app.enableCors({
  //   origin: '*',
  //   methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  //   allowedHeaders: 'Content-Type, Accept',
  //   credentials: true,
  // });
  app.useGlobalFilters(new GlobalExceptionFilter(configService));

  app.enableCors();
  // Use global prefix if you don't have subdomain
  app.setGlobalPrefix(
    configService.getOrThrow('app.apiPrefix', { infer: true }),
    {
      exclude: [
        { method: RequestMethod.GET, path: '/' },
        { method: RequestMethod.GET, path: 'health' },
      ],
    },
  );

  app.enableVersioning({
    type: VersioningType.URI,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      errorHttpStatusCode: HttpStatus.UNPROCESSABLE_ENTITY,
      exceptionFactory: (errors: ValidationError[]) => {
        return new UnprocessableEntityException(errors);
      },
    }),
  );
  app.useGlobalGuards(new AuthGuard(reflector, app.get(AuthService)));
  //************************************************************
  // [Enable/Disable] Swagger UI
  //************************************************************
  if (!isProduction) {
    setupSwagger(app);
  }
  app.useGlobalInterceptors(new ClassSerializerInterceptor(reflector));

  await app.listen(
    configService.getOrThrow('app.port', { infer: true }),
    async () => {
      console.info(`
    ======================================================================================================
        Name: [${configService.getOrThrow('app.name', { infer: true })}] - Port: [${configService.getOrThrow('app.port', { infer: true })}] - Environment: [${configService.getOrThrow('app.nodeEnv', { infer: true })}]
        ${!isProduction ? `Swagger UI: ${(await app.getUrl()).replace(`[::1]`, `localhost`).trim()}/api-docs` : 'Swagger UI: Disabled'}
    ======================================================================================================
  `);
    },
  );
}
void bootstrap();
