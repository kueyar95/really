import { Company } from '../../modules/companies/entities/company.entity';
import { AppDataSource } from './seed-config';

export const seedCompanies = async () => {
  const companyRepository = AppDataSource.getRepository(Company);

  const companyData = {
    name: 'Really Demo',
    description: 'Empresa de demostración Really',
    status: 'active',
  };

  const existingCompany = await companyRepository.findOne({
    where: { name: companyData.name },
  });

  if (!existingCompany) {
    const company = companyRepository.create(companyData);
    await companyRepository.save(company);
    return company;
  }

  return existingCompany;
};