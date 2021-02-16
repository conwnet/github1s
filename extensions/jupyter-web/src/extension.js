import vscode from "vscode";

export const parseUri = (uri) => {
	const [owner, repo, branch] = (uri.authority || "")
		.split("+")
		.filter(Boolean);
	return {
		owner,
		repo,
		branch,
		path: uri.path,
	};
};

vscode.commands.registerCommand("jupyter.showPreview", async function (uri) {
	try {
		const { owner, repo, branch, path } = parseUri(uri);
		// const success = await vscode.commands.executeCommand('vscode.previewHtml', previewUri, vscode.ViewColumn.Two, 'IPython Notebook Preview');
		// Create and show panel
		const panel = vscode.window.createWebviewPanel(
			"nbpreviewer",
			"Jupyter Notebook Previewer",
			vscode.ViewColumn.Two,
			{ enableScripts: true, retainContextWhenHidden: true }
		);
		panel.webview.html = `
            <style> 
                .vscode-dark { 
                    padding: 0px !important; 
                } 
                #menubar { 
                    display : none !important; 
                } 
                .nbviewer { 
                    padding-top: 0px !important ; 
                }  
            </style>
            <iframe 
                class="ifrm" 
                style="height: 100vh; width: 100vw; padding: 0px;" 
                class="webview ready" 
                sandbox="allow-scripts allow-same-origin allow-forms allow-pointer-lock allow-downloads" 
                src="https://nbviewer.jupyter.org/github/${owner}/${repo}/blob/${branch}${path}"
            >
            </iframe>
        `;
		console.log("successfully showed notebook");
	} catch (reason) {
		console.error(reason);
		vscode.window.showErrorMessage(
			"An error occured while rendering the Notebook"
		);
	}
});

vscode.workspace.onDidOpenTextDocument((e) => {
	const currnetFileExtension = e.fileName;
	if (currnetFileExtension.substr(-6) === ".ipynb") {
		vscode.commands.executeCommand("jupyter.showPreview", e.uri);
	}
});
