import fs from "fs/promises";
import yaml from "js-yaml";

export class NeutronConfig {
    // Server options
    public port: number = 8080;
    public debug: boolean = false;
    public host: string = "0.0.0.0";

    // Folders
    public data_folder: string = "./data";
    public logs_folder: string = "./logs";

    // Logging options
    public logging_console: boolean = true;
    public logging_file: boolean = true;
    public logging_max_files: string = "14d";

    // master_key
    public store_master_key_in_keychain: boolean = false;
    public masterkey_keychain_service: string = "NeutronServer";
    public masterkey_keychain_account: string = "masterkey";

    // ssl options
    public ssl_enabled: boolean = false;
    public ssl_key: string = "";
    public ssl_cert: string = "";

    // database options
    public database_type: string = "postgres";

    private content: any = {};

    constructor(content: any = {}) {
        this.content = content;

        const getPath = <T = any>(pathStr: string, fallback: T): T => {
            if (!pathStr) return fallback;
            const keys = pathStr.split(".");
            let current: any = this.content;

            for (const key of keys) {
                if (current && typeof current === "object" && key in current) {
                    current = current[key];
                } else {
                    return fallback;
                }
            }
            return current as T;
        };

        this.port = getPath<number>("server.port", this.port);
        this.debug = getPath<boolean>("server.debug", this.debug);
        this.host = getPath<string>("server.host", this.host);

        this.data_folder = getPath<string>("neutron.data_folder", this.data_folder);

        this.logs_folder = getPath<string>("logging.logs_folder", this.logs_folder);
        this.logging_console = getPath<boolean>("logging.console", this.logging_console);
        this.logging_file = getPath<boolean>("logging.file", this.logging_file);
        this.logging_max_files = getPath<string>("logging.max_files", this.logging_max_files);

        this.store_master_key_in_keychain = getPath<boolean>("masterkey.store_in_keychain", this.store_master_key_in_keychain);
        this.masterkey_keychain_service = getPath<string>("masterkey.keychain_service", this.masterkey_keychain_service);
        this.masterkey_keychain_account = getPath<string>("masterkey.keychain_account", this.masterkey_keychain_account);

        this.ssl_enabled = getPath<boolean>("server.ssl.enabled", this.ssl_enabled);
        this.ssl_key = getPath<string>("server.ssl.key", this.ssl_key);
        this.ssl_cert = getPath<string>("server.ssl.cert", this.ssl_cert);

        this.database_type = getPath<string>("database.type", this.database_type);
    }

    /**
     * Safely load a NeutronConfig from a YAML file
     */
    public static async loadSafe(path: string = "config.yml"): Promise<NeutronConfig> {
        try {
            const fileContents = await fs.readFile(path, "utf8");
            const parsed = yaml.load(fileContents);
            return this.safeConstruct(parsed);
        } catch (err) {
            console.warn(`Failed to load config from ${path}, using defaults.`, err);
            return new NeutronConfig();
        }
    }

    /**
     * Construct a NeutronConfig safely from any object
     */
    private static safeConstruct(content: any): NeutronConfig {
        try {
            if (typeof content !== "object" || content === null) {
                throw new Error("Config content is not an object");
            }
            return new NeutronConfig(content);
        } catch (err) {
            console.warn("Invalid config content, using defaults.", err);
            return new NeutronConfig();
        }
    }

    /**
     * Get a nested value from the YAML content with optional fallback
     * Example: config.getPath("neutron.data_folder", "./default_data")
     */

    public getPathOrDefault<T = any>(pathStr: string, fallback: T): T {
        if (!pathStr) return fallback;

        const keys = pathStr.split(".");
        let current: any = this.content;

        for (const key of keys) {
            if (current && typeof current === "object" && key in current) {
                current = current[key];
            } else {
                return fallback;
            }
        }

        return (current !== undefined && current !== null ? current : fallback) as T;
    }
}