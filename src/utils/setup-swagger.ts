import { type INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllConfigType } from '../config/config.type';

function setupSwagger(app: INestApplication) {
  const configService = app.get(ConfigService<AllConfigType>);
  const appName = configService.getOrThrow('app.name', { infer: true });

  const config = new DocumentBuilder()
    .setTitle(appName)
    .setDescription('API documentation')
    .setVersion('1.0')
    .setContact('Company Name', 'https://example.com', 'contact@company.com')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'Api-Key', in: 'header' }, 'Api-Key')
    .addServer(
      configService.getOrThrow('app.url', { infer: true }),
      'Development',
    )
    .addServer('https://example.com', 'Staging')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api-docs', app, document, {
    customSiteTitle: appName,
    swaggerOptions: {
      persistAuthorization: true,
    },
  });
}

export default setupSwagger;