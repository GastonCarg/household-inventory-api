import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { LocationDto } from './locations.dto';
import { Location } from './locations.entity';
import { LocationsService } from './locations.service';

@Controller('locations')
export class LocationsController {
  constructor(private readonly locationsService: LocationsService) {}

  @Get()
  getLocations(): Promise<Location[]> {
    return this.locationsService.getLocations();
  }

  @Get('/:id')
  getLocationById(@Param('id') id: string): Promise<Location> {
    return this.locationsService.getLocationById(id);
  }

  @Post()
  addLocation(@Body() body: LocationDto): Promise<Location> {
    return this.locationsService.createLocation(body);
  }
}
