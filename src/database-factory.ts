import "reflect-metadata";
import { DataSource } from "typeorm"
import path = require("path");
import { UserEntity } from "./entities/UserEntity";
import { ReportEntity } from "./entities/ReportEntitiy.interface";
import { UploadFilesEntity } from "./entities/UploadFilesEntity.interface";

const isProduction = process.env.NODE_ENV === 'production';

const entities = [
    UserEntity,
    ReportEntity,
    UploadFilesEntity
]

class DBFactory {

    public static new(dialect: string) : DataSource {

        switch (dialect) {
            case "sqlite":
                return new DataSource({
                    type: "sqlite",
                    database: path.join(__dirname, '../', sqliteDBName()),
                    synchronize: true,
                    logging: false,
                    entities: entities,
                    migrations: [],
                    subscribers: [],
                })
                
            case "mssql":
                return new DataSource({
                    type: "mssql",
                    host: "localhost",
                    port: 1433,
                    username: process.env.dbusername,
                    password: process.env.dbpassword,
                    database: process.env.dbname,
                    synchronize: true,
                    logging: false,
                    entities: entities,
                    migrations: [],
                    subscribers: [],
                })
        
            default:
                throw new Error(`Unknown database type ${dialect}`);
        }
    }
}

function sqliteDBName() {
    if (isProduction) return 'database.sqlite';
    return 'database.dev.sqlite';
}

export default DBFactory