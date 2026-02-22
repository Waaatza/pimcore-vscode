import * as vscode from "vscode";
import { ContainerStore } from "../symfony/ContainerStore";
import { ServiceDefinitionViewProvider } from "./containerview/ServiceDefinitionViewProvider";

export class ServicesCommandController {
    private _containerStore: ContainerStore;
    private _serviceDefinitionViewProvider: ServiceDefinitionViewProvider;

    constructor(containerStore: ContainerStore, serviceDefinitionViewProvider: ServiceDefinitionViewProvider) {
        this._containerStore = containerStore;
        this._serviceDefinitionViewProvider = serviceDefinitionViewProvider;

        vscode.commands.registerCommand('symfony-vscode.refreshServiceDefinitions', () => {
            this._containerStore.clearCacheAndRefreshServices();
        });

        vscode.commands.registerCommand('symfony-vscode.toggleClassDisplay', () => {
            this._serviceDefinitionViewProvider.toggleClassDisplay();
        });

        vscode.commands.registerCommand('symfony-vscode.searchForServices', async () => {
            const criteria = await vscode.window.showInputBox({
                prompt: "Criteria (e.g. \"AppBundle\", \"acme.helper\" ...)",
                value: this._serviceDefinitionViewProvider.previousSearchCriteria
            });

            if (criteria !== undefined) {
                this._serviceDefinitionViewProvider.setCriteria(criteria);
            }
        });

        vscode.commands.registerCommand('symfony-vscode.clearServicesSearch', () => {
            this._serviceDefinitionViewProvider.clearCriteria();
        });
    }
}