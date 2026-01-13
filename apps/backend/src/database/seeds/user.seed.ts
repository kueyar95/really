import { User } from '../../modules/users/entities/user.entity';
import { Company } from '../../modules/companies/entities/company.entity';
import { Role } from '../../modules/users/enums/role.enum';
import { AppDataSource, supabase } from './seed-config';

export const seedUsers = async () => {
  const userRepository = AppDataSource.getRepository(User);
  const companyRepository = AppDataSource.getRepository(Company);

  // Obtener la compañía  
  const company = await companyRepository.findOne({
    where: { name: 'Really Demo' },
  });

  if (!company) {
    return;
  }

  const defaultPassword = 'Demo123!';

  const users = [
    {
      username: 'Super Admin',
      email: 'super.admin@demo.com',
      role: Role.SUPER_ADMIN,
      companyId: company.id,
      company: company,
    },
    {
      username: 'Admin Demo',
      email: 'admin@demo.com',
      role: Role.ADMIN,
      companyId: company.id,
      company: company,
    },
    {
      username: 'Vendedor Demo',
      email: 'vendedor@demo.com',
      role: Role.VENDEDOR,
      companyId: company.id,
      company: company,
    }
  ];

  for (const userData of users) {
    const existingUser = await userRepository.findOne({
      where: { email: userData.email },
    });

    if (!existingUser) {
      try {
        // Obtener usuario de Supabase
        const { data: { users: supabaseUsers }, error: getUserError } = await supabase.auth.admin.listUsers();
        const supabaseUser = supabaseUsers.find((u: any) => u.email === userData.email);

        let supabaseId;

        if (!supabaseUser) {
          // Crear usuario en Supabase solo si no existe
          const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
            email: userData.email,
            password: defaultPassword,
            email_confirm: true
          });

          if (authError) {
            continue;
          }

          supabaseId = authUser.user.id;
        } else {
          supabaseId = supabaseUser.id;
        }

        // Crear usuario en nuestra base de datos
        const user = userRepository.create({
          ...userData,
          supabaseId
        });

        await userRepository.save(user);
      } catch (error) {
        // Error procesando usuario
      }
    }
  }
};