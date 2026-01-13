import { PartialType } from '@nestjs/mapped-types';
import { CreateAiBotDto } from './create-ai-bot.dto';

export class UpdateAiBotDto extends PartialType(CreateAiBotDto) {}
