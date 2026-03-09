import "reflect-metadata";
import { DataSource, DataSourceOptions } from "typeorm";
import { ZariumConfig } from "../ZariumConfig";
import { User } from "./entities/User";
import {UserSession} from "./entities/UserSessions";
import path from "node:path";
import {UserTOTP} from "./entities/UserTOTP";
import {UserAvatar} from "./entities/UserAvatar";

const entities = [User, UserTOTP, UserSession, UserAvatar];

export class Database {
    private static instance: Database;
    public dataSource!: DataSource;

    private constructor() {}

    public static getInstance(): Database {
        if (!Database.instance) {
            Database.instance = new Database();
        }
        return Database.instance;
    }

    public static getDataSource(): DataSource {
        return Database.getInstance().dataSource;
    }

    async init(config: ZariumConfig): Promise<void> {
        let options: DataSourceOptions;

        const dbType = config.database_type === "sqlite3" ? "sqlite" : config.database_type;

        if (dbType === "postgres") {
            options = {
                type: "postgres",
                host: config.getPathOrDefault("database.host", "localhost"),
                port: config.getPathOrDefault("database.port", 5432),
                username: config.getPathOrDefault("database.user", "Zarium"),
                password: config.getPathOrDefault("database.password", ""),
                database: config.getPathOrDefault("database.database", "Zarium"),
                ssl: config.getPathOrDefault("database.ssl", false) ? { rejectUnauthorized: false } : false,
                entities: entities,
                synchronize: true,
            };
        } else if (dbType === "mysql") {
            options = {
                type: "mysql",
                host: config.getPathOrDefault("database.host", "localhost"),
                port: config.getPathOrDefault("database.port", 3306),
                username: config.getPathOrDefault("database.user", "Zarium"),
                password: config.getPathOrDefault("database.password", ""),
                database: config.getPathOrDefault("database.database", "Zarium"),
                entities: entities,
                synchronize: true,
            };
        } else if (dbType === "sqlite") {
            const dbPath = config.getPathOrDefault<string>(
                "database.path",
                path.join(config.data_folder, "Zarium.db")
            );
            options = {
                type: "sqlite",
                database: dbPath,
                entities: entities,
                synchronize: true,
            };
        } else {
            throw new Error(`Unsupported database type for TypeORM: ${config.database_type}`);
        }

        this.dataSource = new DataSource(options);
        await this.dataSource.initialize();
    }

    async close(): Promise<void> {
        if (this.dataSource.isInitialized) {
            await this.dataSource.destroy();
        }
    }
}
