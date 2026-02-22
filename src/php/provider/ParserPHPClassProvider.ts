import * as vscode from "vscode";
import { PHPClassProviderInterface } from "./PHPClassProviderInterface";
import { PHPClass } from "../PHPClass";
import * as engine from "php-parser";
import { readFile } from "graceful-fs";
import { PromiseUtils } from "../PromiseUtils";
import { PHPUse } from "../PHPUse";

interface PHPParser_Item {
    kind: string;
    loc: PHPParser_Location;
    name?: string | PHPParser_Item;
    children?: PHPParser_Item[];
    items?: PHPParser_UseItem[];
    body?: PHPParser_Item[];
}

interface PHPParser_UseItem {
    kind: string;
    name: string;
    alias?: string;
}

interface PHPParser_Location {
    start: PHPParser_Position;
    end: PHPParser_Position;
}

interface PHPParser_Position {
    line: number;
    column: number;
    offset: number;
}

export class ParserPHPClassProvider implements PHPClassProviderInterface {

    protected _engine: engine.Engine;
    protected _configuration = vscode.workspace.getConfiguration("symfony-vscode");

    constructor() {
        this._engine = new engine.Engine({
            parser: {
                php7: true
            },
            ast: {
                withPositions: true
            }
        });
    }

    canUpdateAllUris(): boolean {
        return true;
    }

    canUpdateUri(uri: vscode.Uri): boolean {
        return true;
    }

    updateAllUris(): Promise<PHPClass[]> {
        return new Promise((resolve, reject) => {
            vscode.workspace.findFiles("**/*.php").then(uris => {
                const ps = uris.map(uri => () => this.updateUri(uri));
                PromiseUtils.throttleActions(ps, this._getParserThrottle())
                    .then(phpClassesArray => {
                        const resultArray: PHPClass[] = [];
                        phpClassesArray.forEach(phpClasses => {
                            const filtered = phpClasses.filter(c => c !== null);
                            resultArray.push(...filtered);
                        });
                        resolve(resultArray);
                    })
                    .catch(reason => reject(reason));
            });
        });
    }

    updateUri(uri: vscode.Uri): Promise<PHPClass[]> {
        return new Promise<PHPClass[]>((resolve) => {
            readFile(uri.fsPath, (err, data) => {
                if (err) {
                    resolve([]);
                } else {
                    try {
                        const ast = this._engine.parseCode(data.toString(), uri.fsPath); // <-- Filename als 2. Parameter
                        resolve(this._hydratePHPClass(ast, uri));
                    } catch (e) {
                        resolve([]);
                    }
                }
            });
        });
    }

    protected _hydratePHPClass(ast: PHPParser_Item, uri: vscode.Uri): PHPClass[] {
        try {
            const result: PHPClass[] = [];
            let nextElementsToProcess: PHPParser_Item[] = ast.children ?? [];
            let currentNamespace: string = null;
            const uses: PHPUse[] = [];

            while (nextElementsToProcess.length > 0) {
                const currentElement = nextElementsToProcess.shift();
                if (!currentElement) continue;

                if (currentElement.kind === "namespace") {
                    currentNamespace = currentElement.name as string;
                    nextElementsToProcess = currentElement.children ?? [];
                }

                if (currentElement.kind === "usegroup") {
                    uses.push(...this._processUseGroup(currentElement));
                }

                if (currentElement.kind === "class" || currentElement.kind === "interface") {
                    result.push(this._processClass(currentElement, uri, currentNamespace));
                }
            }

            result.forEach(phpClass => phpClass.uses = uses);

            return result;
        } catch (e) {
            return [];
        }
    }

    protected _processClass(element: PHPParser_Item, uri: vscode.Uri, namespace?: string): PHPClass {
        let fullName: string = typeof element.name === "object"
            ? (element.name as PHPParser_Item).name as string
            : element.name as string;

        if (namespace) {
            fullName = `${namespace}\\${fullName}`;
        }

        const phpClass = new PHPClass(fullName, uri);

        (element.body ?? []).forEach(classElement => {
            if (classElement.kind === "method" && classElement.name) {
                phpClass.addMethod((classElement.name as PHPParser_Item).name as string);
            }
        });

        phpClass.classPosition = new vscode.Position(
            element.loc.start.line, element.loc.start.column
        );

        return phpClass;
    }

    protected _processUseGroup(element: PHPParser_Item): PHPUse[] {
        return (element.items ?? []).map(item => new PHPUse(item.name, item.alias));
    }

    private _getParserThrottle(): number {
        return this._configuration.get<number>("phpParserThrottle") ?? 5;
    }
}