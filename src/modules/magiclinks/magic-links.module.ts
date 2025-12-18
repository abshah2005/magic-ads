import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MagicLink, MagicLinkSchema } from './schemas/magic-links.schema';
import { MagicLinkRepository } from './magic-links.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: MagicLink.name, schema: MagicLinkSchema }]),
  ],
  providers: [MagicLinkRepository],
  exports: [MagicLinkRepository], // Export AuthRepository for use in other modules
})
export class MagicLinksModule {}