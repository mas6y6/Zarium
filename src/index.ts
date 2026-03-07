import {ZariumServer} from "./server/ZariumServer";
import {Command} from "commander";

const program = new Command();
program
    .name("Zarium")
    .description("Zarium Server")
    .version("1.0.0")
    .option("-c, --config <path>", "path to config file", "config.yml")
    .action(async (options) => {
        try {
            new ZariumServer();
            await ZariumServer.getInstance().init(options.config);
            ZariumServer.getInstance().start();
        } catch (e: unknown) {
            if (e instanceof Error) {
                console.error("[ CRASHED ]\n" + e.stack);
            } else {
                console.error("[ CRASHED ]\n", e);
            }
            process.exit(1);
        }
    });

program.parse(process.argv);