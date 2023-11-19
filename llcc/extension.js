const vscode = require('vscode');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http')

let serverProcess = null;
let serverRunning = false;
let logStream = null;
let text = '';


function activate(context) {

	const logFilePath = path.join(context.extensionPath, 'server.log');
	logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
	logStream.on('error', (err) => {
		console.error(`Log Stream Error: ${err}`);
	});
	const condaBasePath = '/home/rafael/mambaforge/bin/';
	const modelsPath = '/home/rafael/ml/llama.cpp/models';

	const command = `bash -c "source '${condaBasePath}activate' 'llm_inference' && cd '${modelsPath}' && python3 -m llama_cpp.server --model mistral-7b-instruct-v0.1.Q4_K_M.gguf --n_gpu_layers 35"`;

	

	// const activeEditor = vscode.NotebookDocument;
	// console.log(vscode.window.activeNotebookEditor.selection[0]);



	// let nblistener = vscode.workspace.onDidChangeNotebookDocument(event => {

	// 	const activeCell = vscode.window.activeNotebookEditor.notebook.cellAt(vscode.window.activeNotebookEditor.selections[0].end)

	// 	const edit = new vscode.WorkspaceEdit();
	// 	const cellRange = new vscode.Range(activeCell.document.lineAt(0).range.start, activeCell.document.lineAt(activeCell.document.lineCount - 1).range.end);
	// 	edit.replace(activeCell.document.uri, cellRange, "farts");
	// 	const endOfCell = activeCell.document.lineAt(activeCell.document.lineCount - 1).range.end;
	// 	edit.insert(activeCell.document.uri, endOfCell, '\n' + 'farts2');

	// 	vscode.workspace.applyEdit(edit);

		// const uri = vscode.window.activeNotebookEditor.notebook.uri
		// edit.replace(uri, cellRange, response);

		// console.log(vscode.window.activeNotebookEditor(event2 => { event2.}))


	// });
	// context.subscriptions.push(nblistener);


	let textChangeListener = vscode.workspace.onDidChangeTextDocument(event => {
		if (event.document.uri.fsPath.endsWith('.ipynb')) {
			text = event.document.getText();
			console.log(text);
			// const activeCell = vscode.window.activeNotebookEditor.notebook.cellAt(vscode.window.activeNotebookEditor.selections[0].end);
			// console.log(activeCell)
			// const endOfCell = activeCell.document.lineAt(activeCell.document.lineCount - 1).range.end;
			// console.log(endOfCell)
		}
	});


	let disposable = vscode.commands.registerCommand('llcc.to_llm', async () => {
		if (text !== '') {
			try {
				const responseContent = await sendMessageToServer(text);
	
				const activeCell = vscode.window.activeNotebookEditor.notebook.cellAt(vscode.window.activeNotebookEditor.selections[0].end);
				console.log(activeCell)
				const endOfCell = activeCell.document.lineAt(activeCell.document.lineCount - 1).range.end;
	
				// Create a WorkspaceEdit and insert the responseContent
				const edit = new vscode.WorkspaceEdit();
				edit.insert(activeCell.document.uri, endOfCell, '\n' + responseContent);
				await vscode.workspace.applyEdit(edit);
			} catch (error) {
				console.error('Error sending message to server:', error);
			}
		} else {
			console.log('No text available to send');
		}
	});


	let disposableToggleServer = vscode.commands.registerCommand('llcc.toggleServer', function () {
		if (serverRunning) {
			exec("lsof -i tcp:8000 -t", (err, stdout, stderr) => {
				if (err) {
					// Handle the error if no server is found running on port 8000
					vscode.window.showErrorMessage('Error finding server on port 8000.');
					return;
				}

				const pid = stdout.trim();
				if (pid) {
					// If a PID is found, use it to stop the server
					exec(`kill -9 ${pid}`, (killErr, killStdout, killStderr) => {
						if (killErr) {
							vscode.window.showErrorMessage(`Failed to kill server on port 8000: ${killErr.message}`);
							return;
						}
						serverRunning = false;
						vscode.window.showInformationMessage('Server on port 8000 has been stopped.');
					});
				}
			});
		} else {

			logStream.write(`\nStarting server at ${new Date().toISOString()}\n`);
			serverProcess = spawn(command, { shell: true });
			serverProcess.stdout.pipe(logStream);
			serverProcess.stderr.pipe(logStream);
			serverRunning = true;
			vscode.window.showInformationMessage('Server started.');
		}
	});

	context.subscriptions.push(disposableToggleServer,textChangeListener);
}



// function sendMessageToServer(prompt) {
// 	const data = JSON.stringify({
// 		messages: [
// 			{
// 				content: "You are a helpful assistant.",
// 				role: "system"
// 			},
// 			{
// 				content: prompt,
// 				role: "user"
// 			}
// 		]
// 	});

// 	const options = {
// 		hostname: 'localhost',
// 		port: 8000,
// 		path: '/v1/chat/completions',
// 		method: 'POST',
// 		headers: {
// 			'Content-Type': 'application/json',
// 			'Accept': 'application/json'
// 		},
// 	};

// 	const req = http.request(options, (res) => {
// 		let responseData = '';

// 		res.on('data', (chunk) => {
// 			responseData += chunk;
// 		});

// 		res.on('end', () => {
// 			try {
// 				const responseJson = JSON.parse(responseData);
// 				console.log(responseJson.choices[0].message.content);
// 			} catch (error) {
// 				console.error(`Error parsing response: ${error.message}`);
// 			}
// 		});
// 	});

// 	req.on('error', (error) => {
// 		console.error(`Error: ${error.message}`);
// 	});

// 	req.write(data);
// 	req.end();
// }


async function sendMessageToServer(prompt) {
    const data = JSON.stringify({
        messages: [
            {
                content: "You are a helpful assistant.",
                role: "system"
            },
            {
                content: prompt,
                role: "user"
            }
        ]
    });

    const options = {
        hostname: 'localhost',
        port: 8000,
        path: '/v1/chat/completions',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
        },
    };

    // Return a new Promise
    return new Promise((resolve, reject) => {
        const req = http.request(options, (res) => {
            let responseData = '';

            res.on('data', (chunk) => {
                responseData += chunk;
            });

            res.on('end', () => {
                try {
                    const responseJson = JSON.parse(responseData);
                    // Resolve the promise with the content
                    resolve(responseJson.choices[0].message.content);
                } catch (error) {
                    console.error(`Error parsing response: ${error.message}`);
                    reject(error);
                }
            });
        });

        req.on('error', (error) => {
            console.error(`Error: ${error.message}`);
            reject(error);
        });

        req.write(data);
        req.end();
    });
}


function deactivate() {
	// Add logic here to stop the server when the extension is deactivated
	if (serverRunning) {
		// Try to stop the server using the PID from lsof
		logStream.write(`\nStopping server at ${new Date().toISOString()}\n`);
		exec("lsof -i tcp:8000 -t", (err, stdout, stderr) => {
			if (stdout) {
				const pid = stdout.trim();
				exec(`kill -9 ${pid}`);

			}

		});
	}
}




module.exports = {
	activate,
	deactivate
};