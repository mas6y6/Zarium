import {RawData, WebSocket} from "ws";
import jwt from "jsonwebtoken";
import express, {Application, ErrorRequestHandler, RequestHandler, Router} from "express";
import {ZariumServer} from "./ZariumServer";

export function waitForMessage(ws: WebSocket): Promise<string> {
    return new Promise((resolve) => {
        const handler = (msg: RawData) => {
            ws.off("message", handler); // remove listener after first message
            resolve(msg.toString());
        };
        ws.on("message", handler);
    });
}


type HttpMethod = "get" | "post" | "put" | "delete" | "patch" | "options" | "head";

export function handleCSRF(target: Application | Router) {
    const csrfHandler: ErrorRequestHandler = (err, req, res, next) => {
        if (err.code !== "EBADCSRFTOKEN") return next(err);
        res.status(403).json({ detail: "Invalid CSRF token" });
    };

    target.use(csrfHandler);
}

export function handleErrors(target: Application | Router) {
    const notFound: RequestHandler = (req, res) => {
        res.status(404).json({ detail: "Not Found" });
    };
    target.use(notFound);

    const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
        console.error(err);
        res.status(err.status || 500).json({
            detail: err.message || "Internal Server Error",
        });
    };
    target.use(errorHandler);
}

export function requireJson(req: express.Request, res: express.Response) {
    if (req.headers['content-type'] !== "application/json") {
        res.status(400).json({ detail: "Invalid content type." });
        return false;
    }
    return true;
}

export interface UserJwtPayload {
    userId: string;
    sessionId: string;
    refresh_key?: string;
}

export interface SafeRequest extends express.Request {
    user?: UserJwtPayload | null;
}

export function safeRoute(
    app: express.Application,
    path: string,
    method: HttpMethod,
    handler: RequestHandler,
    options = { require_auth: false }
) {
    const wrappedHandler: RequestHandler = options.require_auth
        ? (req: SafeRequest, res, next) => {
            let token: string | undefined;

            const authHeader = req.headers.authorization;
            if (authHeader?.startsWith("Bearer ")) {
                token = authHeader.split(" ")[1];
            } else if (req.cookies?.["access-token"]) {
                token = req.cookies["access-token"];
            }

            if (!token) return res.status(401).json({ detail: "Missing access token" });

            // TODO: Actually check if the token is valid

            try {
                req.user = jwt.verify(token, ZariumServer.getInstance().ACCESS_TOKEN_SECRET) as UserJwtPayload;
                handler(req, res, next);
            } catch {
                return res.status(401).json({ detail: "Invalid or expired token" });
            }
        }
        : handler;

    app[method](path, wrappedHandler);

    const allMethods: HttpMethod[] = ["get", "post", "put", "delete", "patch", "options", "head"];
    allMethods
        .filter(m => m !== method)
        .forEach(m => {
            app[m](path, (req, res) => {
                res.set("Allow", method.toUpperCase());
                res.status(405).json({ detail: "Method Not Allowed" });
            });
        });
}

export function parseTime(str: string): number {
    const match = str.match(/^(\d+)([dhms])$/);
    if (!match) throw new Error("Invalid time format");

    const num = parseInt(match[1]);
    const unit = match[2];

    switch (unit) {
        case "d": return num * 86400000;
        case "h": return num * 3600000;
        case "m": return num * 60000;
        case "s": return num * 1000;
        default: throw new Error("Invalid time unit");
    }
}