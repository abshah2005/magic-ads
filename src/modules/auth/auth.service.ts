import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { MagicLinkRepository } from '../magiclinks/magic-links.repository';
import { SessionRepository } from '../sessions/sessions.repository';
import {
  signAccessToken,
  signRefreshToken,
  hashToken,
  compareHash,
  verifyAccessToken,
} from '../../common/utils/token.util';
import { CreateUserDto } from '../users/dto/create-users.dto';
import { GoogleAuthService } from 'src/integrations/googleAuth/google-auth.service';
import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import { UsersRepository } from '../users/users.repository';
import { ApiResponse } from 'src/common/responses/api-response';
import { extractToken } from 'src/common/utils/extractToken.util';
import { EmailService } from '../email/email.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly usersRepository: UsersRepository,
    private readonly googleAuthService: GoogleAuthService,
    private readonly authRepository: MagicLinkRepository,
    private readonly sessionRepository: SessionRepository,
    private readonly emailService: EmailService,
  ) {}

  /** Google OAuth signup/login */
  async googleSignupOrLogin(token: string): Promise<ApiResponse> {
    const googleUser = await this.googleAuthService.verifyGoogleToken(token);

    const userData: CreateUserDto = {
      username: googleUser.firstName || 'test_name',
      email: googleUser.email || 'test_email@gmail.com',
      googleId: googleUser.googleId,
      firstName: googleUser.firstName,
      lastName: googleUser.lastName,
      profilePic: googleUser.picture,
      password: 'google-oauth',
      profilePicKey: null,
    };

    let user = await this.usersRepository.findByGoogleId(googleUser.googleId);
    if (!user) user = await this.usersService.signup(userData);

    const refreshToken = signRefreshToken();
    const refreshHash = await hashToken(refreshToken);

    const session = await this.sessionRepository.createSession({
      userId: user._id,
      refreshTokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      userAgent: '',
    });

    const accessToken = signAccessToken({ sub: user._id, email: user.email });
    const responseData = {
      user,
      accessToken,
      refreshToken,
      sessionId: session._id,
    };

    return ApiResponse.success(responseData, 'Logged in via Google OAuth');
  }

  /** Magic link request */
  async requestMagicLink(
    email: string,
    ip: string,
    userAgent: string,
  ): Promise<ApiResponse> {
    let user = await this.usersService.findByEmail(email);
    if (!user) {
      const userData: CreateUserDto = {
        username: email.split('@')[0], // Use email prefix as default username
        email: email,
        googleId: undefined, // No Google ID for magic link signup
        firstName: 'Guest', // Default first name
        lastName: 'User', // Default last name
        profilePic: null, // Default profile picture
        password: 'magic-link', // Set password for magic link authentication
        profilePicKey: null,
      };
      user = await this.usersService.signup(userData);
    }

    const rawToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = await hashToken(rawToken);
    const expiresAt = new Date(Date.now() + 1000 * 60 * 15); // 15 min
    await this.authRepository.createMagicLink(email, tokenHash, expiresAt);
    console.log(rawToken);

    try {
      await this.emailService.sendMagicLinkEmail(email, rawToken);
      return ApiResponse.success(
        null,
        'A magic link has been sent to your email. Please check your inbox to proceed.',
        200,
      );
    } catch (error) {
      console.error('Failed to send magic link email:', error);
      return ApiResponse.success(
        { rawToken }, // For development/testing
        'Magic link generated but email failed to send',
      );
    }
  }

  /** Magic link verify */
  async verifyMagicLink(
    token: string,
    ip: string,
    userAgent: string,
  ): Promise<ApiResponse> {
    const allLinks = await this.authRepository.findAllValidLinks();
    const link = await Promise.all(
      allLinks.map(async (l) =>
        (await compareHash(token, l.tokenHash)) ? l : null,
      ),
    );
    const validLink = link.find(Boolean);
    if (!validLink)
      throw new BadRequestException('Invalid or expired magic link');

    await this.authRepository.markUsed(validLink._id.toString());

    let user = await this.usersService.findByEmail(validLink.email);
    if (!user)
      user = await this.usersService.signup({
        email: validLink.email,
        username: validLink.email.split('@')[0],
      });

    const refreshToken = signRefreshToken();
    const refreshHash = await hashToken(refreshToken);

    const session = await this.sessionRepository.createSession({
      userId: user._id,
      refreshTokenHash: refreshHash,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
      userAgent,
      ip,
    });

    const accessToken = signAccessToken({ sub: user._id, email: user.email });
    const responseData = {
      user,
      accessToken,
      refreshToken,
      sessionId: session._id,
    };

    return ApiResponse.success(responseData, 'Logged in via magic link');
  }

  async getCurrentUser(authHeader: string) {
    try {
      const decoded = verifyAccessToken(authHeader) as any;
      const user = await this.usersRepository.findById(decoded.sub as string);
      // console.log(user);
      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      return user;
    } catch (error) {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  /** Refresh token rotation */
  async refreshSession(
    sessionId: string,
    refreshToken: string,
  ): Promise<ApiResponse> {
    const session = await this.sessionRepository.findSessionById(sessionId);
    if (!session || session.revoked || session.expiresAt < new Date())
      throw new BadRequestException('Invalid session');

    const valid = await compareHash(refreshToken, session.refreshTokenHash);
    if (!valid) {
      await this.sessionRepository.revokeSession(session._id.toString());
      throw new BadRequestException('Refresh token reuse detected');
    }

    const newRefreshToken = signRefreshToken();
    session.refreshTokenHash = await hashToken(newRefreshToken);
    session.expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await session.save();

    const user = await this.usersRepository.findById(session.userId.toString());
    const accessToken = signAccessToken({ sub: user?._id, email: user?.email });

    const responseData = { accessToken, newRefreshToken };
    return ApiResponse.success(responseData, 'Session refreshed successfully');
  }
}
