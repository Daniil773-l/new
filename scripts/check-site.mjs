import { access, readFile } from "node:fs/promises";
import { constants } from "node:fs";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const currentFile = fileURLToPath(import.meta.url);
const scriptsDir = path.dirname(currentFile);
const projectRoot = path.resolve(scriptsDir, "..");

const siteDir = path.join(projectRoot, "site");
const indexPath = path.join(siteDir, "index.html");



function fail(message) {
    console.error(`ERROR: ${message}`);
    process.exitCode = 1;
}

async function exists(filePath) {
    try {
        await access(filePath, constants.F_OK);
        return true;
    } catch {
        return false;
    }
}

if (!(await exists(indexPath))) {
    fail("не найден site/index.html");
} else {
    console.log("OK: site/index.html найден");

    const html = await readFile(indexPath, "utf8");

    const title = html
        .match(/<title>(.*?)<\/title>/is)?.[1]
        ?.trim();

    if (!title) {
        fail("в index.html отсутствует заполненный <title>");
    } else {
        console.log("OK: <title> заполнен");
    }

    const references = [
        ...html.matchAll(/(?:href|src)=["']([^"']+)["']/gi),
    ]
        .map((match) => match[1])
        .filter(
            (value) =>
                !/^(?:https?:|mailto:|tel:|#|data:)/i.test(value),
        );

    const missing = [];

    for (const reference of references) {
        const cleanReference = reference.split(/[?#]/, 1)[0];

        const resolved = path.resolve(
            siteDir,
            cleanReference.replace(/^\//, ""),
        );

        if (!(await exists(resolved))) {
            missing.push(reference);
        }
    }

    if (missing.length > 0) {
        fail(
            `не найдены локальные файлы: ${missing.join(", ")}`,
        );
    } else {
        console.log(
            "OK: локальные ссылки ведут на существующие файлы",
        );
    }
}

if (!process.exitCode) {
    console.log("Проверка сайта завершена успешно.");
}