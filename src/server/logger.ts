import winston from "winston";
import DailyRotateFile from "winston-daily-rotate-file";
import fs from "fs/promises";
import path from "path";

export interface LoggerOptions {
    level?: string;
    logsFolder?: string;
    console?: boolean;
    file?: boolean;
    maxFiles?: string;
}

export async function createLogger(options: LoggerOptions = {}): Promise<winston.Logger> {
    const level = options.level ?? "info";
    const logsFolder = options.logsFolder ? path.resolve(options.logsFolder) : path.resolve("./logs");
    const enableConsole = options.console ?? true;
    const enableFile = options.file ?? true;
    const maxFiles = options.maxFiles ?? "14d";

    if (enableFile) {
        await fs.mkdir(logsFolder, { recursive: true }).catch(() => {});
    }

    // --- formatter ---
    const formatter = winston.format.combine(
        winston.format.timestamp({ format: "HH:mm:ss" }),   // add timestamp
        winston.format.printf(info => {
            // fallback values if undefined
            const ts = info.timestamp ?? new Date().toLocaleTimeString();
            const lvl = (info.level ?? "INFO").toUpperCase();
            const msg = info.message ?? "";
            return `[${ts}] ${lvl}: ${msg}`;
        })
    );

    const transports: winston.transport[] = [];

    if (enableConsole) {
        transports.push(new winston.transports.Console({ format: formatter }));
    }

    if (enableFile) {
        transports.push(new DailyRotateFile({
            dirname: logsFolder,
            filename: "%DATE%.log",
            datePattern: "YYYY-MM-DD",
            zippedArchive: false,
            level,
            format: formatter,
            maxFiles,
        }));
    }

    return winston.createLogger({
        level,
        transports,
        exitOnError: false,
    });
}