export type Message = {
  id: string;
  text: string;
  date: string;
  isBot: boolean;
};

export type Chat = {
  id: string;
  name: string;
  phone: string;
  lastMessageDate: string;
  messages: Message[];
};

export type Client = {
  id: string;
  name: string;
  email: string;
  phone: string;
  stage_id: string;
  assigned_to: string | null;
  data: Record<string, unknown>;
  chat_history: Message[];
  created_at: string;
  updated_at: string;
};

export type Stage = {
  id: string;
  funnel_id: string;
  bot_id: string;
  name: string;
  order: number;
  description: string;
  status: 'new' | 'in_progress' | 'qualified' | 'unqualified';
  created_at: string;
  updated_at: string;
};

export const mockData = {
  clients: [
    {
      id: "client_1",
      name: "Juan Pérez",
      email: "juan@email.com",
      phone: "+56912345678",
      stage_id: "stage_1",
      assigned_to: null,
      data: {
        lastPurchase: "2024-01-15",
        preferences: ["tech", "gadgets"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `Hola, necesito información sobre el producto ${i + 1}` : `Claro, te puedo ayudar con información sobre el producto ${i + 1}. ¿Qué necesitas saber específicamente?`,
        date: new Date(2024, 0, 15, 10, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-15T00:00:00Z",
    },
    {
      id: "client_2",
      name: "María González",
      email: "maria@email.com",
      phone: "+56987654321",
      stage_id: "stage_2",
      assigned_to: null,
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `¿Cuál es el precio del servicio ${i + 1}?` : `El precio del servicio ${i + 1} es $${(i + 1) * 100}. ¿Necesitas más detalles?`,
        date: new Date(2024, 0, 14, 15, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_3",
      name: "Carlos Ruiz",
      email: "carlos@email.com",
      phone: "+34 612345678",
      stage_id: "stage_3",
      assigned_to: null,
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `Hola, necesito información sobre el producto ${i + 1}` : `Claro, te puedo ayudar con información sobre el producto ${i + 1}. ¿Qué necesitas saber específicamente?`,
        date: new Date(2024, 0, 15, 10, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_4",
      name: "María López",
      email: "maria@email.com",
      phone: "+34 623456789",
      stage_id: "stage_4",
      assigned_to: null,
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `¿Cuál es el precio del servicio ${i + 1}?` : `El precio del servicio ${i + 1} es $${(i + 1) * 100}. ¿Necesitas más detalles?`,
        date: new Date(2024, 0, 14, 15, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_5",
      name: "Juan García",
      email: "juan@email.com",
      phone: "+34 634567890",
      stage_id: "stage_5",
      assigned_to: "Por asignar",
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `Hola, necesito información sobre el producto ${i + 1}` : `Claro, te puedo ayudar con información sobre el producto ${i + 1}. ¿Qué necesitas saber específicamente?`,
        date: new Date(2024, 0, 15, 10, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_6",
      name: "Ana Martín",
      email: "ana@email.com",
      phone: "+34 645678901",
      stage_id: "stage_2",
      assigned_to: null,
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `Hola, necesito información sobre el producto ${i + 1}` : `Claro, te puedo ayudar con información sobre el producto ${i + 1}. ¿Qué necesitas saber específicamente?`,
        date: new Date(2024, 0, 15, 10, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_7",
      name: "Ana Martín",
      email: "ana@email.com",
      phone: "+34 645678901",
      stage_id: "stage_2",
      assigned_to: null,
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `Necesito cambiar mi reserva ${i + 1}` : `Por supuesto, podemos ayudarte a cambiar tu reserva ${i + 1}. ¿Para qué fecha te gustaría cambiarla?`,
        date: new Date(2024, 0, 11, 11, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_8",
      name: "Roberto Díaz",
      email: "roberto@email.com",
      phone: "+34 612345679",
      stage_id: "stage_2",
      assigned_to: null,
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `¿Tienen disponibilidad para el día ${i + 1}?` : `Sí, tenemos disponibilidad para el día ${i + 1}. ¿Te gustaría agendar una cita?`,
        date: new Date(2024, 0, 12, 14, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_9",
      name: "Elena Martínez",
      email: "elena@email.com",
      phone: "+34 623456780",
      stage_id: "stage_1",
      assigned_to: null,
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `Necesito cambiar mi reserva ${i + 1}` : `Por supuesto, podemos ayudarte a cambiar tu reserva ${i + 1}. ¿Para qué fecha te gustaría cambiarla?`,
        date: new Date(2024, 0, 11, 11, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_10",
      name: "Pablo Gómez",
      email: "pablo@email.com",
      phone: "+34 634567891",
      stage_id: "stage_5",
      assigned_to: "Ana",
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `¿Tienen disponibilidad para el día ${i + 1}?` : `Sí, tenemos disponibilidad para el día ${i + 1}. ¿Te gustaría agendar una cita?`,
        date: new Date(2024, 0, 12, 14, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_11",
      name: "Isabel Ruiz",
      email: "isabel@email.com",
      phone: "+34 645678902",
      stage_id: "stage_1",
      assigned_to: null,
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `Tengo un problema con mi cuenta ${i + 1}` : `Entiendo tu problema. Vamos a revisar tu cuenta ${i + 1} para solucionarlo.`,
        date: new Date(2024, 0, 13, 9, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_12",
      name: "Diana López",
      email: "diana@email.com",
      phone: "+34 667890124",
      stage_id: "stage_3",
      assigned_to: null,
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `Tengo un problema con mi cuenta ${i + 1}` : `Entiendo tu problema. Vamos a revisar tu cuenta ${i + 1} para solucionarlo.`,
        date: new Date(2024, 0, 13, 9, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_13",
      name: "Fernando Gil",
      email: "fernando@email.com",
      phone: "+34 678901235",
      stage_id: "stage_4",
      assigned_to: null,
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `¿Cuál es el precio del servicio ${i + 1}?` : `El precio del servicio ${i + 1} es $${(i + 1) * 100}. ¿Necesitas más detalles?`,
        date: new Date(2024, 0, 14, 15, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
    {
      id: "client_14",
      name: "Marta Sanz",
      email: "marta@email.com",
      phone: "+34 689012346",
      stage_id: "stage_5",
      assigned_to: "Por asignar",
      data: {
        lastPurchase: "2024-01-10",
        preferences: ["software", "cloud"],
      },
      chat_history: Array.from({ length: 10 }, (_, i) => ({
        id: `msg${i + 1}`,
        text: i % 2 === 0 ? `¿Cuál es el precio del servicio ${i + 1}?` : `El precio del servicio ${i + 1} es $${(i + 1) * 100}. ¿Necesitas más detalles?`,
        date: new Date(2024, 0, 14, 15, i * 5).toISOString(),
        isBot: i % 2 == 0
      })),
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-10T00:00:00Z",
    },
  ],
  stages: [
    {
      id: "stage_1",
      funnel_id: "funnel_1",
      bot_id: "bot_1",
      name: "Saludo",
      order: 1,
      description: "Conversaciones automáticas de ventas",
      status: "new",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
    },
    {
      id: "stage_2",
      funnel_id: "funnel_1",
      bot_id: "bot_1",
      name: "Escoger especialista",
      order: 2,
      description: "Respuestas a preguntas frecuentes",
      status: "new",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
    },
    {
      id: "stage_3",
      funnel_id: "funnel_1",
      bot_id: "bot_1",
      name: "Agendar cita",
      order: 3,
      description: "Gestión automática de reservas",
      status: "new",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
    },
    {
      id: "stage_4",
      funnel_id: "funnel_1",
      bot_id: "bot_1",
      name: "Pagar",
      order: 4,
      description: "Asistencia técnica automatizada",
      status: "new",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
    },
    {
      id: "stage_5",
      funnel_id: "funnel_1",
      bot_id: null,
      name: "Asistencia Humana",
      order: 5,
      description: "Atención personalizada",
      status: "new",
      created_at: "2024-01-15T10:00:00Z",
      updated_at: "2024-01-15T10:00:00Z",
    }
  ],
};