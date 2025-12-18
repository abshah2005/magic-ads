import { Module, ValidationPipe } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import Joi from 'joi';
import { DatabaseModule } from './integrations/mongodb/mongodb.module';
import { UsersModule } from './modules/users/users.module';
import { GoogleAuthModule } from './integrations/googleAuth/google-auth.module';
import { WorkspacesModule } from './modules/workspaces/work-spaces.module';
import { AuthModule } from './modules/auth/auth.module';
import { FoldersModule } from './modules/folders/folders.module';
import { AssetsModule } from './modules/assets/assets.module';
import { JwtModule } from '@nestjs/jwt';
import { JwtAuthGuard } from './modules/auth/guards/jwt-auth.guard';
import { AdsModule } from './modules/ads/ads.module';
import { CommonModule } from './common/common.module';
import { EmailModule } from './modules/email/email.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { R2Service } from './integrations/r2/r2.service';
import { MediaModule } from './modules/media/media.module';
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        MONGO_URI: Joi.string().uri().required(),
        MONGO_DB_NAME: Joi.string().optional(),
        MONGO_RETRY_ATTEMPTS: Joi.number().default(5),
        MONGO_RETRY_DELAY_MS: Joi.number().default(3000),
      }),
    }),

    ThrottlerModule.forRoot([
      {
        ttl: 60000, // 1 minute
        limit: 100, // 100 requests per minute
      },
    ]),

    DatabaseModule,
    AssetsModule,
    CommonModule,
    EmailModule,
    AdsModule,
    MediaModule,
    AuthModule,
    FoldersModule,
    UsersModule,
    WorkspacesModule,
    GoogleAuthModule,
  ],
  providers: [
    {
      provide: 'APP_PIPE',
      useClass: ValidationPipe,
    },
    {
      provide: 'APP_GUARD',
      useClass: JwtAuthGuard,
    },
    {
      provide: 'APP_GUARD',
      useClass: ThrottlerGuard,
    },
    R2Service,
  ],
})
export class AppModule {}
