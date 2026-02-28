import express, {ErrorRequestHandler, NextFunction} from "express";
import * as http from "node:http";
import * as path from "node:path";
import * as fs from "fs/promises";
import {NeutronConfig} from "./NeutronConfig";
import keytar from "keytar";
import crypto from "crypto";
import { createLogger } from "./logger";
import winston from "winston";
import * as https from "node:https";
import {WebSocketServer, WebSocket} from "ws";
import {IncomingMessage} from "node:http";
import {Socket} from "node:net";
import {renderTemplate} from "./templateRender";
import {Database} from "./database/Database";

export class NeutronServer {
    public static instance: NeutronServer;
    public app!: express.Application;
    public server!: http.Server;
    public port: number = 3000;
    public config!: NeutronConfig;
    public logger!: winston.Logger;
    public database!: Database;
    public masterkey!: Buffer;
    public firstStart: boolean = false;
    public wss = new WebSocketServer({ noServer: true });
    public wsRouteHandlers: { [url: string]: (ws: WebSocket, req: IncomingMessage) => void } = {};
    private superadminKey: string = "";

    public static getInstance(): NeutronServer {
        if (!NeutronServer.instance) {
            throw new Error("NeutronServer instance not initialized");
        }
        return NeutronServer.instance;
    }

    constructor() {
        if (NeutronServer.instance) {
            throw new Error("NeutronServer instance already initialized");
        }

        NeutronServer.instance = this;
    }

    async init(configPath: string = "config.yml") {
        try {
            await fs.access(configPath);
            this.config = await NeutronConfig.loadSafe(configPath);

            this.port = this.config.port;

            const dataFolderPath = path.resolve(this.config.data_folder);
            try {
                await fs.access(dataFolderPath);
                // exists
            } catch (err) {
                if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                    await fs.mkdir(dataFolderPath, {recursive: true});
                    this.firstStart = true;
                } else {
                    throw err;
                }
            }

            this.logger = await createLogger({
                level: this.config.debug ? "debug" : "info",
                logsFolder: this.config.logs_folder,
                console: this.config.logging_console,
                file: this.config.logging_file,
                maxFiles: this.config.logging_max_files,
            });
        } catch (err) {
            if ((err as NodeJS.ErrnoException).code === "ENOENT") {
                this.config = new NeutronConfig();
                const dataFolderPath = path.resolve(this.config.data_folder);
                await fs.mkdir(dataFolderPath, { recursive: true });
            } else {
                console.error(err);
            }
        }

        if (this.config.store_master_key_in_keychain) {
            let stored = await keytar.getPassword(this.config.masterkey_keychain_service, this.config.masterkey_keychain_account);

            if (stored) {
                this.masterkey = Buffer.from(stored, "base64");
            } else {
                this.masterkey = crypto.randomBytes(32);
                await keytar.setPassword(this.config.masterkey_keychain_service, this.config.masterkey_keychain_account, this.masterkey.toString("base64"));
            }
        } else {
            try {
                await fs.access(path.join(this.config.data_folder, "masterkey.key"));
                let base64 = await fs.readFile(path.join(this.config.data_folder, "masterkey.key"), "utf-8");
                this.masterkey = Buffer.from(base64, "base64");
            } catch {
                this.masterkey = crypto.randomBytes(32);
                await fs.writeFile(path.join(this.config.data_folder, "masterkey.key"), this.masterkey.toString("base64"), "utf-8");
            }
        }

        this.database = Database.getInstance();
        await this.database.init(this.config);

        this.app = express();
        if (this.config.ssl_enabled) {
            const key = await fs.readFile(this.config.ssl_key);
            const cert = await fs.readFile(this.config.ssl_cert);

            this.server = https.createServer(
                {
                    key,
                    cert,
                },
                this.app
            );
        } else {
            this.server = http.createServer(this.app);
        }

        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
        this.app.use('/static', express.static(path.join(__dirname, 'public')));

        this.server.on('upgrade', (request: IncomingMessage, socket: Socket, head: Buffer) => {
            const handler = request.url ? this.wsRouteHandlers[request.url] : undefined;

            if (!handler) {
                socket.destroy();
                return;
            }

            this.wss.handleUpgrade(request, socket, head, (ws: WebSocket, _req: IncomingMessage) => {
                handler(ws, request);
            });
        });

        const routes = await fs.readdir(path.join(__dirname, "routes"));
        routes.forEach((file) => {
            require("./routes/" + file);
        });

        if (this.firstStart) {
            this.superadminKey = crypto.randomBytes(12).toString("hex");

            this.logger.info("-------------------------------------------------------");
            this.logger.info("");
            this.logger.info("This is the first time that this Neutron server has been started!");
            this.logger.info("");
            this.logger.info(`Your superadmin key for this server is: ${this.superadminKey}`);
            this.logger.info("THIS KEY CANNOT BE USED MORE THAN ONCE!");
            this.logger.info("");
            this.logger.info("-------------------------------------------------------");
        }
    }

    public start() {
        this.app.use(async (req, res, next) => {
            res.status(404).send(await renderTemplate("error.html"));
        });

        this.server.listen(this.port, this.config.host, () => {
            if (this.config.ssl_enabled) {
                this.logger.info(`Neutron Server running at https://${this.config.host}:${this.port}`);
            } else {
                this.logger.info(`Neutron Server running at http://${this.config.host}:${this.port}`);
            }
        });
    }

    public registerWsRoute(
        url: string,
        handler: (ws: WebSocket, req: IncomingMessage) => void
    ) {
        this.wsRouteHandlers[url] = handler;
    }
}