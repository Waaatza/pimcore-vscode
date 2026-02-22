import * as vscode from "vscode";
import * as fs from "graceful-fs";
import * as stripJsonComments from "strip-json-comments";

export class ComposerJSON {

    public async initialize(): Promise<{ symfonyVersion: number, uri: vscode.Uri }> {

        if (!vscode.workspace.workspaceFolders) {
            throw new Error("No workspace folder opened");
        }

        /*
         * composer.lock bevorzugen (zuverlässigste Quelle)
         */
        const lockFiles = await vscode.workspace.findFiles("**/composer.lock");

        for (const uri of lockFiles) {
            try {
                const content = fs.readFileSync(uri.fsPath, "utf8");
                const lockObj = JSON.parse(stripJsonComments(content));

                const packages = [
                    ...(lockObj.packages || []),
                    ...(lockObj["packages-dev"] || [])
                ];

                const symfonyPackage = packages.find((p: any) =>
                    p.name === "symfony/framework-bundle" ||
                    p.name === "symfony/symfony"
                );

                if (symfonyPackage?.version) {
                    const match = symfonyPackage.version.match(/\d+/);
                    const majorVersion = match ? parseInt(match[0], 10) : 0;

                    return {
                        symfonyVersion: majorVersion,
                        uri
                    };
                }
            } catch (e) {
                console.warn("Failed parsing composer.lock:", e);
            }
        }

        /*
         * Fallback: composer.json prüfen
         */
        const composerFiles = await vscode.workspace.findFiles("**/composer.json");

        for (const uri of composerFiles) {
            try {
                const content = fs.readFileSync(uri.fsPath, "utf8");
                const composerObj = JSON.parse(stripJsonComments(content));

                const require = composerObj.require || {};

                const symfonyDep =
                    require["symfony/framework-bundle"] ||
                    require["symfony/symfony"];

                if (symfonyDep) {
                    const match = symfonyDep.match(/\d+/);
                    const majorVersion = match ? parseInt(match[0], 10) : 0;

                    return {
                        symfonyVersion: majorVersion,
                        uri
                    };
                }

                /*
                 * Pimcore Fallback
                 * Wenn pimcore/pimcore vorhanden ist,
                 * Symfony-Version aus pimcore-Version ableiten
                 */
                if (require["pimcore/pimcore"]) {

                    const pimcoreVersion = require["pimcore/pimcore"];
                    const match = pimcoreVersion.match(/\d+/);
                    const pimcoreMajor = match ? parseInt(match[0], 10) : 0;

                    // Pimcore 11.x basiert auf Symfony 6.x
                    if (pimcoreMajor >= 11) {
                        return {
                            symfonyVersion: 6,
                            uri
                        };
                    }
                }

            } catch (e) {
                console.warn("Failed parsing composer.json:", e);
            }
        }

        throw new Error("No Symfony installation detected in workspace");
    }
}