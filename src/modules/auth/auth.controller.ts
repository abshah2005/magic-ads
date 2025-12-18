import {
  Controller,
  Post,
  Body,
  Get,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from 'src/common/decorators/public.decorator';
import { User } from 'src/common/decorators/user.decorator';
import { ApiResponse } from 'src/common/responses/api-response';
import { WorkspaceRepository } from '../workspaces/work-spaces.repository';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly workspaceRepository: WorkspaceRepository,
  ) {}

  @Public()
  @Post('magic-link')
  @HttpCode(HttpStatus.OK)
  async requestMagicLink(@Body('email') email: string, @Req() req: any) {
    return this.authService.requestMagicLink(
      email,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Public()
  @Get('magic-login')
  async magicLogin(@Req() req) {
    return this.authService.verifyMagicLink(
      req.query.token,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Get('me')
  async getCurrentUser(@User() user: any) {
    const workspaceCount = await this.workspaceRepository
      .getModel()
      .countDocuments({ creatorId: user._id });
    const hasWorkspaces = workspaceCount > 0;
    return ApiResponse.success(
      { user, hasWorkspaces },
      'logged in User',
      200,
    );
  }

  /** Google OAuth signup/login */
  @Public()
  @Post('google-login')
  @HttpCode(HttpStatus.OK)
  async googleSignupOrLogin(@Query('token') token: string) {
    return this.authService.googleSignupOrLogin(token);
  }

  /** Refresh session */
  @Public()
  @Post('refresh-session')
  @HttpCode(HttpStatus.OK)
  async refreshSession(
    @Body('sessionId') sessionId: string,
    @Body('refreshToken') refreshToken: string,
  ) {
    return this.authService.refreshSession(sessionId, refreshToken);
  }
}
