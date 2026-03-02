import ejs from "ejs";
import fs from "fs/promises";
import path from "path";

// @ts-ignore
import setupHtml from "./templates/setup/setup.html";
// @ts-ignore
import errorHtml from "./templates/error.html";

const embeddedTemplates: Record<string, string> = {
    "setup/setup.html": setupHtml,
    "error.html": errorHtml
};

export const renderData = {
    urlFor(path: string): string {
        return `/static/${path}`;
    }
};

export async function renderTemplate(file: string, data: any = {}) {
    let templateContent: string;
    const templatePath = path.join(process.cwd(), "templates", file);
    try {
        templateContent = await fs.readFile(templatePath, "utf8");
    } catch (e) {
        if (embeddedTemplates[file]) {
            templateContent = embeddedTemplates[file];
        } else {
            throw e;
        }
    }
    return ejs.render(templateContent, { ...data , ...renderData }, { async: true });
}