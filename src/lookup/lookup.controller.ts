import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { Throttle, ThrottlerGuard } from '@nestjs/throttler';
import { BarcodeLookupResponse, ImageLookupDto, ImageLookupResponse } from './lookup.dto';
import { LookupService } from './lookup.service';

@UseGuards(ThrottlerGuard)
@Controller('lookup')
export class LookupController {
  constructor(private readonly lookupService: LookupService) {}

  // Continuous scanning fires many lookups in a row
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  @Get('/barcode/:code')
  lookupBarcode(@Param('code') code: string): Promise<BarcodeLookupResponse> {
    return this.lookupService.lookupBarcode(code);
  }

  @Get('/image/status')
  imageLookupStatus(): { enabled: boolean } {
    return { enabled: this.lookupService.isImageLookupEnabled() };
  }

  // Keep well under the Gemini free tier limits
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @Post('/image')
  lookupImage(@Body() body: ImageLookupDto): Promise<ImageLookupResponse> {
    return this.lookupService.lookupImage(body);
  }
}
