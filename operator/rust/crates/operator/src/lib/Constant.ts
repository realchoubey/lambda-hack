
class Constant {
    get expressPort(): number {
        return Number(process.env.EXPRESS_PORT) || 3000;
    }

    get host(): string {
        return process.env.HOST || '127.0.0.1';
    }

    get connectionUrl(): string {
        return `postgres://${process.env.PG_USER}:${process.env.PG_PASSWORD}@${process.env.PG_HOST}:${process.env.PG_PORT}/${process.env.PG_DEFAULT_DB}`;
    }

    get DBConfig() {
        return {
            user: process.env.PG_USER || 'postgres',
            host: process.env.PG_HOST || 'localhost',
            password: process.env.PG_PASSWORD || 'root',
            port: process.env.PG_PORT || '5432',
            database: process.env.PG_DEFAULT_DB || 'postgres',
        };
    }

    get environment(): string {
        return process.env.ENVIRONMENT!; // development/production
    }

    get isDevelopment(): boolean {
        const oThis = this;
        return oThis.environment == 'development';
    }

    get isProduction(): boolean {
        const oThis = this;
        return oThis.environment == 'production';
    }

    get sesConfig(): {
        aws_access_key: string;
        aws_secret_key: string;
        region: string;
    } {
        return {
            aws_access_key: process.env.AWS_SES_ACCESS_KEY_Id!,
            aws_secret_key: process.env.AWS_SES_ACCESS_SECRET_KEY!,
            region: process.env.AWS_SES_REGION!,
        };
    }

    get caCertPermissionFilePath(): string {
        return process.env.SSL_PEM_FILE_PATH!;
    }
}

export default new Constant();
