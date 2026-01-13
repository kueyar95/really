// apps/backend/src/modules/integrations/whatsapp/whatsapp-credentials.service.ts
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { WhatsappCredentials } from './entities/wa-credentials.entity';

type UpsertPayload = {
  companyId: string;
  accessToken?: string | null;
  wabaId?: string | null;
  phoneNumberId?: string | null;
  status?: string;
};



@Injectable()
export class WhatsappCredentialsService {
  constructor(
    @InjectRepository(WhatsappCredentials)
    private readonly repo: Repository<WhatsappCredentials>,
  ) {}

  async createOrUpdateByCompany(payload: UpsertPayload) {
    const {
      companyId,
      accessToken = null,
      wabaId = null,
      phoneNumberId = null,
      status = 'connected',
    } = payload;

    const existing = await this.repo.findOne({ where: { companyId } });

    if (existing) {
      // Actualiza solo lo que tengas; deja el resto como está
      existing.accessToken   = accessToken ?? existing.accessToken ?? null;
      existing.wabaId        = wabaId ?? existing.wabaId ?? null;
      existing.phoneNumberId = phoneNumberId ?? existing.phoneNumberId ?? null;
      existing.status        = status ?? existing.status;
      return this.repo.save(existing);
    }

    const created = this.repo.create({
      companyId,
      accessToken,
      wabaId,
      phoneNumberId,
      status,
    });

    return this.repo.save(created);
  }
}
