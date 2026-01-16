import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { Plan, PlanSchema } from './schemas/plans.schema';
import { PlansController } from './plans.controller';
import { PlansService } from './plans.service';
import { PlanRepository } from './plans.repository';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]),
  ],
  controllers: [PlansController],
  providers: [
    PlansService,
    PlanRepository,
  ],
  exports: [PlansService,MongooseModule,PlanRepository],
})
export class PlansModule {}