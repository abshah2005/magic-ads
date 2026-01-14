import {
  Controller,
  Body,
  Param,
  Put,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { UpdateUserDto } from './dto/update-users.dto';
import { ApiResponse } from 'src/common/responses/api-response';
import { UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
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
