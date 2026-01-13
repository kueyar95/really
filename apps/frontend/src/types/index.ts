export type DashboardStatus = {
  onboarding: boolean;
};

export type OnboardingData = {
  name: string;
  sex: "male" | "female";
  birthDate: Date;
  country: string;
  phone: string;
};
