import * as vscode from "vscode"
import { ServiceDefinition } from "../../../symfony/ServiceDefinition"

export class PHPServiceCompletionItem extends vscode.CompletionItem {
    private _serviceDefinition: ServiceDefinition

    constructor(serviceDefinition: ServiceDefinition) {
        super(serviceDefinition.id, vscode.CompletionItemKind.Reference)
        this._serviceDefinition = serviceDefinition

        this.detail = serviceDefinition.id
        this.documentation = new vscode.MarkdownString(`Class: \`${serviceDefinition.className}\``)
        this.insertText = serviceDefinition.isServiceIdAClassName()
            ? `${serviceDefinition.className}::class`
            : serviceDefinition.id
    }
}