import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThan, Repository } from 'typeorm';
import { DEFAULT_UNIT, Unit } from '../products/units';
import { ProductCatalog } from './catalog.entity';

const DAY_MS = 1000 * 60 * 60 * 24;

export const normalizeTitle = (title: string): string =>
  title
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export interface CatalogUsage {
  title: string;
  barcode?: string | null;
  expireDate: string;
  location: { id: string };
  unit?: Unit;
}

export interface ExternalProduct {
  barcode: string;
  title: string;
  brand: string | null;
  imageUrl: string | null;
}

@Injectable()
export class CatalogService {
  constructor(
    @InjectRepository(ProductCatalog)
    private catalogRepository: Repository<ProductCatalog>,
  ) {}

  findByBarcode(barcode: string): Promise<ProductCatalog | null> {
    return this.catalogRepository.findOne({
      where: { barcode },
      relations: ['defaultLocation'],
    });
  }

  getFrequent(limit: number = 12): Promise<ProductCatalog[]> {
    return this.catalogRepository.find({
      where: { timesUsed: MoreThan(0) },
      order: { timesUsed: 'DESC', lastUsedAt: 'DESC' },
      take: Math.min(Math.max(limit, 1), 50),
      relations: ['defaultLocation'],
    });
  }

  async cacheExternal(product: ExternalProduct): Promise<ProductCatalog> {
    const entry = this.catalogRepository.create({
      ...product,
      normalizedTitle: normalizeTitle(product.title),
    });
    return this.catalogRepository.save(entry);
  }

  async recordUsage(usages: CatalogUsage[]): Promise<void> {
    const now = new Date();

    for (const { title, barcode, expireDate, location, unit } of usages) {
      const normalizedTitle = normalizeTitle(title);
      const entry =
        (await this.catalogRepository.findOneBy(
          barcode ? { barcode } : { normalizedTitle, barcode: IsNull() },
        )) ??
        this.catalogRepository.create({
          barcode: barcode || null,
          timesUsed: 0,
        });

      const shelfLifeDays = Math.round((new Date(expireDate).getTime() - now.getTime()) / DAY_MS);

      this.catalogRepository.merge(entry, {
        title,
        normalizedTitle,
        defaultLocation: { id: location.id },
        ...(shelfLifeDays > 0 && { shelfLifeDays }),
        defaultUnit: unit ?? DEFAULT_UNIT,
        timesUsed: entry.timesUsed + 1,
        lastUsedAt: now,
      });

      await this.catalogRepository.save(entry);
    }
  }
}
