import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { LocationDto } from './locations.dto';
import { Location } from './locations.entity';

@Injectable()
export class LocationsService {
  constructor(
    @InjectRepository(Location)
    private locationRepository: Repository<Location>,
  ) {}

  async getLocations() {
    const locations: Location[] = await this.locationRepository.find();
    if (!locations || !locations.length) throw new NotFoundException();

    return locations;
  }

  async getLocationById(id: string): Promise<Location> {
    if (!id) throw new BadRequestException();

    const location = await this.locationRepository.findOneBy({ id });
    if (!location) throw new NotFoundException();

    return location;
  }

  async createLocation(body: LocationDto): Promise<Location> {
    const { name } = body;
    if (!name) throw new BadRequestException();

    const newLocation = this.locationRepository.create(body);
    if (!newLocation) throw new InternalServerErrorException();

    return await this.locationRepository.save(newLocation);
  }

  async deleteLocation(id: string): Promise<{ status: number; message: string }> {
    if (!id) throw new BadRequestException();

    const location = await this.locationRepository.findOneBy({ id });
    if (!location) throw new NotFoundException();

    return { status: 200, message: 'Ok' };
  }
}
