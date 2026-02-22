import * as vscode from "vscode"
import { ServiceDefinition } from "../../../symfony/ServiceDefinition";

export class ConfigurationFileServiceCompletionItem extends vscode.CompletionItem {
    private _serviceDefinition: ServiceDefinition

    constructor(serviceDefinition: ServiceDefinition) {
        super(serviceDefinition.id, vscode.CompletionItemKind.Reference)
        this._serviceDefinition = serviceDefinition

        this.detail = serviceDefinition.id
        this.documentation = "Of class " + serviceDefinition.className
    }
}