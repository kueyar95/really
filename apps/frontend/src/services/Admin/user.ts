import api from '../api';

export interface CreateUserSignupDto {
  supabaseId: string;
  username: string;
  email: string;
}

export interface CreateCompanyDto {
  name: string;
  website?: string
}

// Servicio para el signup directo (no por invitación)
export const createUserSignup = async (userData: CreateUserSignupDto) => {
  try {
    const response = await api.post('/users/signup', userData);
    return response.data;
  } catch (error) {
    console.error('Error creating user via signup:', error);
    throw error;
  }
};

// Servicio para crear una empresa durante el onboarding
export const createCompany = async (companyData: CreateCompanyDto) => {
  try {
    const response = await api.post('/companies/create-onboarding', companyData);
    return response.data;
  } catch (error) {
    console.error('Error creating company:', error);
    throw error;
  }
}; 