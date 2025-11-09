import * as vscode from 'vscode';
import { I18n } from '../utils/i18n';

export class TranslateTreeViewProvider implements vscode.TreeDataProvider<TranslateTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<TranslateTreeItem | undefined | null | void> = new vscode.EventEmitter<TranslateTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<TranslateTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    constructor(private context: vscode.ExtensionContext) { }

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    getTreeItem(element: TranslateTreeItem): vscode.TreeItem {
        return element;
    }

    getChildren(element?: TranslateTreeItem): Thenable<TranslateTreeItem[]> {
        if (!element) {
            // 根节点
            return Promise.resolve([
                new TranslateTreeItem(
                    I18n.t('treeView.batchTranslate.label'),
                    vscode.TreeItemCollapsibleState.None,
                    'globe',
                    {
                        command: 'ai-translate-wiki.openTranslatePanel',
                        title: I18n.t('treeView.openPanel.title')
                    }
                )
            ]);
        }
        return Promise.resolve([]);
    }
}

export class TranslateTreeItem extends vscode.TreeItem {
    constructor(
        public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly iconName: string,
        public readonly command?: vscode.Command
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label;
        this.iconPath = new vscode.ThemeIcon(this.iconName);
    }
}

