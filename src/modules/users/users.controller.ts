import {
  Controller,
  Post,
  Get,
  Body,
  Headers,
  Query,
  Patch,
  Delete,
  Param,
  UseGuards,
  Req,
  BadRequestException,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-users.dto';
import { GoogleAuthService } from 'src/integrations/googleAuth/google-auth.service';
import { ApiResponse } from 'src/common/responses/api-response';
import { User } from 'src/common/decorators/user.decorator';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly googleAuthService: GoogleAuthService,
  ) {}


  @Put(':id')
  @UseInterceptors(FileInterceptor('profilePic'))
  async updateUser(
    @Param('id') id: string,
    @UploadedFile() profilePic: Express.Multer.File,
    @Body() updateData: UpdateUserDto,
  ): Promise<ApiResponse> {
    if (profilePic) {
      updateData.file = profilePic;
    }
    const user = await this.usersService.updateUser(id, updateData);
    return ApiResponse.success(user, 'User updated successfully');
  }


}
