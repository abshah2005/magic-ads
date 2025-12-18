// src/auth/auth.module.ts
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { JwtMagicLinkStrategy } from './strategies/jwt.strategy';
import { UsersModule } from '../users/users.module';
import { GoogleAuthService } from 'src/integrations/googleAuth/google-auth.service';
import { MagicLinksModule } from '../magiclinks/magic-links.module';
import { SessionsModule } from '../sessions/sessions.module';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { EmailModule } from '../email/email.module';
import { WorkspacesModule } from '../workspaces/work-spaces.module';

@Module({
  imports: [
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: '15m' },
    }),
    UsersModule,
    MagicLinksModule,
    SessionsModule,
    EmailModule,
    WorkspacesModule
  ],
  providers: [AuthService, JwtMagicLinkStrategy,GoogleAuthService,JwtAuthGuard],
  controllers: [AuthController],
  exports:[JwtAuthGuard,AuthService]
})
export class AuthModule {}
