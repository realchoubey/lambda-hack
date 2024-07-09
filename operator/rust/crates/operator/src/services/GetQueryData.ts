import { Sequelize } from "sequelize";
import Postgres from "../lib/Postgres";

export default class GetQueryData {

    private sqlQuery: string;

    private name: string;

    private queryData: any[];

    constructor(params: { sql: string; name: string }) {
        const oThis = this;
        oThis.sqlQuery = params.sql;
        oThis.name = params.name;
        oThis.queryData = [];
    }

    public async perform(): Promise<any> {
        const oThis = this;

        const res = await oThis.fetchData();

        if (res) {
            return res;
        }

        return oThis.prepareResponse();
    }

    private async fetchData() {
        const oThis = this;
        try {
            const sequelize: Sequelize = Postgres.getSequelizeObject();
            const [result, metadata] = await sequelize.query(oThis.sqlQuery, { raw: true })
            oThis.queryData = result;
        } catch (error: any) {
            let errorResonse = {
                success: false,
                debug: { sql: oThis.sqlQuery },
                errorCode: error.code ? error.code : undefined
            }
            if (error.parent && error.parent.message) {
                console.error(`Error: ${error.parent.message}`);
                return {
                    ...errorResonse,
                    msg: `Error: ${error.parent.message}`
                }
            } else {
                return {
                    ...errorResonse,
                    msg: `Error: something went wrong`
                }
            }
        }
    }

    private prepareResponse() {
        const oThis = this;
        console.log(`Task executed, Responding to task...`);
        return {
            success: true,
            data: oThis.queryData
        }
    }
}
