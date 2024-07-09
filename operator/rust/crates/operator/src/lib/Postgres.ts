import { InitOptions, Sequelize } from 'sequelize';
import fs from 'fs';
import Constant from './Constant';

export default class Postgres {
    public sequelize: Sequelize;

    private constructor(initOptions: InitOptions) {
        const oThis = this;
        oThis.sequelize = initOptions.sequelize;
    }

    public static getSequelizeObject(url?: string): Sequelize {
        let connectionUrl = url ? url! : Constant.connectionUrl;
        const sequelize: Sequelize = new Sequelize(connectionUrl, Postgres.getDBConnectionConfig());
        return sequelize;
    }

    public static async getDbModels(): Promise<Postgres> {
        const sequelize: Sequelize = Postgres.getSequelizeObject();
        const initOptions: InitOptions = {
            sequelize,
            underscored: true,
            timestamps: true,
            freezeTableName: true,
        };
        const db = new Postgres(initOptions);
        return db;
    }

    public static async checkDBConnection(): Promise<boolean> {
        const sequelize: Sequelize = Postgres.getSequelizeObject();
        try {
            await sequelize.authenticate();
        } catch {
            return false;
        }
        return true;
    }

    static getDBConnectionConfig(checkSSL: boolean = true): any {
        let config: any = {
            logging: console.log,
            typeValidation: true,
            pool: {
                max: 3,
                min: 0,
                acquire: 30000,
                idle: 10000
            }
        }
        if (Constant.isProduction && checkSSL) {
            config.dialect = 'postgres';
            config.dialectOptions = {
                ssl: Postgres.getSSLConfigValue(),
            };
        }
        return config;
    }

    static getSSLConfigValue(): any {
        let sslConfig: any = {
            rejectUnauthorized: true,
            ca: fs.readFileSync(Constant.caCertPermissionFilePath)
        }
        return sslConfig;
    }
}
