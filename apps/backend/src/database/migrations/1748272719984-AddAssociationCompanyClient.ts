import { MigrationInterface, QueryRunner, TableColumn, TableForeignKey, TableUnique } from "typeorm";

export class AddAssociationCompanyClient1748272719984 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Add company_id column to clients table
        await queryRunner.addColumn('clients', new TableColumn({
            name: 'company_id',
            type: 'uuid',
            isNullable: false, // Assuming a client must belong to a company
        }));

        // Add foreign key constraint
        await queryRunner.createForeignKey('clients', new TableForeignKey({
            columnNames: ['company_id'],
            referencedColumnNames: ['id'],
            referencedTableName: 'companies',
            onDelete: 'CASCADE', // Or 'SET NULL' or 'RESTRICT' depending on your requirements
        }));

        // Add unique constraint for (phone, company_id)
        // The name for the unique constraint should be descriptive
        await queryRunner.createUniqueConstraint('clients', new TableUnique({
            name: 'UQ_phone_company_id',
            columnNames: ['phone', 'company_id'],
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop unique constraint
        // Ensure the name matches the one used in the up method
        await queryRunner.dropUniqueConstraint('clients', 'UQ_phone_company_id');

        // Drop foreign key constraint
        // TypeORM typically names foreign keys like FK_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
        // We might need to find the exact name or rely on TypeORM to find it if only columnNames are specified.
        // For robustness, it's better to use the same object or a name if known.
        // However, providing the TableForeignKey object used for creation often works for dropping.
        const table = await queryRunner.getTable('clients');
        const foreignKey = table.foreignKeys.find(fk => fk.columnNames.indexOf('company_id') !== -1);
        if (foreignKey) {
            await queryRunner.dropForeignKey('clients', foreignKey);
        }

        // Drop company_id column
        await queryRunner.dropColumn('clients', 'company_id');
    }

}
