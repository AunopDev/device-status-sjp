import { Module } from '@nestjs/common';
import { DecodersController } from './decoders.controller';
import { DecodersService } from './decoders.service';

@Module({
  controllers: [DecodersController],
  providers: [DecodersService],
})
export class DecodersModule {}
