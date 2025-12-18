import { Module } from "@nestjs/common";
import { R2Service } from "./r2.service";
import { R2FileValidatorService } from "./r2-file-validator.service";

@Module({
  providers: [R2Service,R2FileValidatorService],
  exports: [R2Service,R2FileValidatorService],
})
export class R2Module {}
