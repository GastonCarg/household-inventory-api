import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { CatalogService } from './catalog.service';

@UseGuards(ThrottlerGuard)
@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('/frequent')
  getFrequent(@Query('limit') limit?: string) {
    return this.catalogService.getFrequent(limit ? Number(limit) : undefined);
  }
}
