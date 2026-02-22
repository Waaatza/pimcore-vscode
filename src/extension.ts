import * as vscode from 'vscode';
import { ServiceDefinitionViewProvider } from "./mvc/containerview/ServiceDefinitionViewProvider";
import { ContainerStore } from './symfony/ContainerStore';
import { RouteDefinitionViewProvider } from './mvc/containerview/RouteDefinitionViewProvider';
import { FileWatchController } from './mvc/FileWatchController';
import { AutocompleteController } from './mvc/AutocompleteController';
import { ParameterViewProvider } from './mvc/containerview/ParameterViewProvider';
import { ServiceDocumentationCodeActionProvider } from './mvc/editing/codeaction/ServiceDocumentationCodeActionProvider';
import { ServicesCommandController } from './mvc/ServicesCommandController';
import { RoutesCommandController } from './mvc/RoutesCommandController';
import { ParametersCommandController } from './mvc/ParametersCommandController';
import { PHPClassStore } from './php/PHPClassStore';
import { PHPClassesController } from './mvc/PHPClassesController';
import { PHPClassCacheManager } from './php/PHPClassCacheManager';
import { ContainerCacheManager } from './symfony/ContainerCacheManager';

export function activate(context: vscode.ExtensionContext) {
    const phpClassCacheManager = new PHPClassCacheManager(context.workspaceState);
    const containerCacheManager = new ContainerCacheManager(context.workspaceState);
    const containerStore = new ContainerStore(containerCacheManager);
    const phpClassStore = new PHPClassStore(phpClassCacheManager);

    const serviceDefinitionViewProvider = new ServiceDefinitionViewProvider();
    const routeDefinitionViewProvider = new RouteDefinitionViewProvider();
    const parameterViewProvider = new ParameterViewProvider();

    containerStore.subscribeListerner(serviceDefinitionViewProvider);
    containerStore.subscribeListerner(routeDefinitionViewProvider);
    containerStore.subscribeListerner(parameterViewProvider);

    vscode.commands.registerCommand('symfony-vscode.refreshContainer', () => {
        containerStore.clearCacheAndRefreshAll();
    });

    vscode.window.registerTreeDataProvider("serviceDefinitionsView", serviceDefinitionViewProvider);
    new ServicesCommandController(containerStore, serviceDefinitionViewProvider);

    vscode.window.registerTreeDataProvider("routeDefinitionsView", routeDefinitionViewProvider);
    new RoutesCommandController(containerStore, routeDefinitionViewProvider);

    vscode.window.registerTreeDataProvider("parametersView", parameterViewProvider);
    new ParametersCommandController(containerStore, parameterViewProvider);

    if (vscode.workspace.getConfiguration("symfony-vscode").get("enableFileWatching")) {
        const fileWatchController = new FileWatchController(containerStore, phpClassStore);
        context.subscriptions.push(fileWatchController);
    }

    const autocompleteController = new AutocompleteController(containerStore, phpClassStore);
    context.subscriptions.push(autocompleteController);

    const serviceDocCodeActionProvider = new ServiceDocumentationCodeActionProvider(phpClassStore);
    containerStore.subscribeListerner(serviceDocCodeActionProvider);
    vscode.languages.registerCodeActionsProvider({ scheme: "file", language: "php" }, serviceDocCodeActionProvider);

    const phpClassesController = new PHPClassesController(phpClassStore);

    containerStore.refreshAll().then(() => phpClassStore.refreshAll());
}

export function deactivate() {}