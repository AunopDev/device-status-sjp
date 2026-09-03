import { Controller, Get } from '@nestjs/common';
import { NodesService } from './nodes.service';

@Controller('nodes')
export class NodesController {
  constructor(private readonly nodesService: NodesService) {}

  @Get()
  findAll(): Promise<unknown[]> {
    return this.nodesService.findAll();
  }
}
