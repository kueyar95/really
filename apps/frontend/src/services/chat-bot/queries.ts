import { AxiosError } from 'axios';
import api from '../api';

interface ChatRequest {
  input: string;
  sessionId: string;
}

export class ChatBotService {
  static async sendMessage(data: ChatRequest): Promise<string> {
    try {
      const response = await api.post<string>('/chat-history/multi-agent', data);
      return response.data;
    } catch (error) {
      if (error instanceof AxiosError) {
        throw new Error(error.response?.data?.message);
      }
      throw new Error('Error inesperado');
    }
  }
}
