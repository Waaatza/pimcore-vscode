import * as vscode from "vscode"
import { Parameter } from "../../../symfony/Parameter"

export class ParameterCompletionItem extends vscode.CompletionItem {
    public parameter: Parameter

    constructor(parameter: Parameter) {
        super(parameter.name, vscode.CompletionItemKind.Property)
        this.parameter = parameter

        this.detail = parameter.name
        this.documentation = new vscode.MarkdownString(`Value: \`${parameter.value}\``)
    }
}