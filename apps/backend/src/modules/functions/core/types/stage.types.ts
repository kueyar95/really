import { FunctionType } from './function.types';

export interface ChangeStageParameters {
  type: 'object';
  properties: {
    stageId: {
      type: 'string';
      description: string;
      const: string;
      enum: string[];
    };
  };
  required: string[];
}

export interface ChangeStageConstData {
  type: FunctionType.CHANGE_STAGE;
  stageId: string;
  name: string;
  description: string;
  agregarWebhook?: boolean;
} 