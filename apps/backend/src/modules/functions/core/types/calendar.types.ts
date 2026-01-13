interface BaseGoogleCalendarConstData {
  name: string;
  calendarId: string;
  description: string;
  duration: string;
  eventName: string;

  // FOR FUTURE UPDATES.
  // calendars: Array<{
  //   tokenId: string;
  //   calendarId: string;
  //   criteria: string;
  // }>;
  // hasConference: boolean;
  // isDescriptionConstant: boolean;
  // notifyBeforeMeeting: boolean;
  // notifyMinutesBefore: string;
  // sendConfirmationMessage: boolean;
  // hourToSendConfirmationMessage: string;
  // daysBeforeConfirmationMessage: string;
  // isDurationGeneratedByAI: boolean;
}

export interface GoogleCalendarAvailabilityParameters {
  type: 'object';
  properties: {
    date: {
      type: 'string';
      description: string;
    };
    endDate: {
      type: 'string';
      description: string;
    };
  };
  required: string[];
}

export interface GoogleCalendarCreateEventParameters {
  type: 'object';
  properties: {
    startTime: {
      type: 'string';
      description: string;
    };
    name: {
      type: 'string';
      description: string;
    };
    email: {
      type: 'string';
      description: string;
    };
    attendeeName?: {
      type: 'string';
      description: string;
    };
  };
  required: string[];
}

export interface GoogleCalendarUpdateEventParameters {
  type: 'object';
  properties: {
    title: {
      type: 'string';
      description: string;
    },
    newTitle: {
      type: 'string';
      description: string;
    },
    startTime: {
      type: 'string';
      description: string;
    },
    date: {
      type: 'string';
      description: string;
    },
    newDate: {
      type: 'string';
      description: string;
    },
    description: {
      type: 'string';
      description: string;
    }
  };
  required: string[];
}

export interface GoogleCalendarListEventsParameters {
  type: 'object';
  properties: {
    date: {
      type: 'string';
      description: string;
    },
    startDate: {
      type: 'string';
      description: string;
    },
    endDate: {
      type: 'string';
      description: string;
    }
  };
  required: string[];
}

export interface GoogleCalendarDeleteEventParameters {
  type: 'object';
  properties: {
    title: {
      type: 'string';
      description: string;
    },
    date: {
      type: 'string';
      description: string;
    }
  };
  required: string[];
}

export interface GoogleCalendarAvailabilityConstData extends BaseGoogleCalendarConstData {
  type: 'get-availability';
}

export interface GoogleCalendarCreateEventConstData extends BaseGoogleCalendarConstData {
  type: 'create-event';
  createMeet?: boolean;
  includeClientAsAttendee?: boolean;
  sendNotifications?: boolean;
}

export interface GoogleCalendarUpdateEventConstData extends BaseGoogleCalendarConstData {
  type: 'update-event';
}

export interface GoogleCalendarListEventsConstData extends BaseGoogleCalendarConstData {
  type: 'list-events';
}

export interface GoogleCalendarDeleteEventConstData extends BaseGoogleCalendarConstData {
  type: 'delete-event';
}

export type GoogleCalendarParameters =
  | GoogleCalendarAvailabilityParameters
  | GoogleCalendarCreateEventParameters
  | GoogleCalendarUpdateEventParameters
  | GoogleCalendarListEventsParameters
  | GoogleCalendarDeleteEventParameters;

export type GoogleCalendarConstData =
  | GoogleCalendarAvailabilityConstData
  | GoogleCalendarCreateEventConstData
  | GoogleCalendarUpdateEventConstData
  | GoogleCalendarListEventsConstData
  | GoogleCalendarDeleteEventConstData;



