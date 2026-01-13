import { MigrationInterface, QueryRunner, TableColumn } from "typeorm";

export class AddNotificationEmailsToStages1746907502374 implements MigrationInterface { // Reemplaza xxxxxxxxxxxxxxx con el timestamp real
    name = 'AddNotificationEmailsToStages1746907502374'; // Reemplaza xxxxxxxxxxxxxxx con el timestamp real

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.addColumn("stages", new TableColumn({
            name: "notification_emails",
            type: "jsonb",
            isNullable: true,
            default: "'[]'" // Default como un string JSON array vacío
        }));
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.dropColumn("stages", "notification_emails");
    }

}