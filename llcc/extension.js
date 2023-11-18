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
	// Define the path to the log file

	const logFilePath = path.join(context.extensionPath, 'server.log');
	logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
	logStream.on('error', (err) => {
		console.error(`Log Stream Error: ${err}`);
	});


	// Define the path to the conda executable and models directory
	const condaBasePath = '/home/rafael/mambaforge/bin/';
	const modelsPath = '/home/rafael/ml/llama.cpp/models';

	// Construct the command to activate conda and start the server
	const command = `bash -c "source '${condaBasePath}activate' 'llm_inference' && cd '${modelsPath}' && python3 -m llama_cpp.server --model mistral-7b-instruct-v0.1.Q4_K_M.gguf --n_gpu_layers 35"`;

	// Log opening of a notebook
	let notebookOpenListener = vscode.workspace.onDidOpenNotebookDocument(notebook => {
		logStream.write(`\nNotebook opened: ${notebook.uri.fsPath} at ${new Date().toISOString()}\n`);
	});
	context.subscriptions.push(notebookOpenListener);

	// let notebookActiveNotebookListener = vscode.window.onDidChangeActiveTextEditor(editor => {
	// 	// Check if the new active editor is a .ipynb file
	// 	if (editor && editor.document && editor.document.uri.fsPath.endsWith('.ipynb')) {
	// 		logStream.write(`\nNotebook active: ${editor.document.getText()}\n`);
	// 		// logStream.write(`\nNotebook active: ${editor.()}\n`

	// 	}
	// });

	// Listener for text changes in documents
	let textChangeListener = vscode.workspace.onDidChangeTextDocument(event => {
		if (event.document.uri.fsPath.endsWith('.ipynb')) {
			text = event.document.getText();  // Update 'text' with the current document content
			console.log(text);
		}
	});

	let disposable = vscode.commands.registerCommand('llcc.to_llm', () => {
		if (text !== '') {
			sendMessageToServer(text);
		} else {
			console.log('No text available to send');
		}
	});
	context.subscriptions.push(textChangeListener, disposable);

	// Add the listener to the context's subscriptions to ensure it's disposed when the extension is deactivated
	// context.subscriptions.push(notebookActiveNotebookListener);



	// logNotebookCellDocuments();


	let notebookChangeListener = vscode.workspace.onDidChangeNotebookDocument((e) => {

		console.log("All content changes:", e.document.content());
	});

	// 	e.contentChanges.forEach(change => {
	// 		console.log(`Change kind: ${change.kind}`); // This will tell us what kind of change it is

	// 		// Log detailed change object
	// 		console.log(change);

	// 		// Attempt to log the text content if it's a content change
	// 		if (change.kind === 1 /* assuming 1 is for content change */) {
	// 			// Make sure we're accessing the document property correctly
	// 			if (change.cell && change.cell.document) {
	// 				const cellContent = change.cell.document.getText();
	// 				console.log(`Cell content: ${cellContent}`);
	// 			}
	// 		}
	// 	});
	// });



	// context.subscriptions.push(notebookChangeListener);


	let disposableToggleServer = vscode.commands.registerCommand('llcc.toggleServer', function () {
		if (serverRunning) {
			// Check if the server is running on localhost:8000
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
			// Start the server
			// logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
			logStream.write(`\nStarting server at ${new Date().toISOString()}\n`);
			serverProcess = spawn(command, { shell: true });
			serverProcess.stdout.pipe(logStream);
			serverProcess.stderr.pipe(logStream);

			// serverProcess.on('close', code => {
			// 	logStream.write(`Server process exited with code ${code} at ${new Date().toISOString()}\n`);
			// 	logStream.end();
			// 	serverRunning = false;
			// });

			serverRunning = true;
			vscode.window.showInformationMessage('Server started.');
		}
	});

	context.subscriptions.push(disposableToggleServer);
}





function sendMessageToServer(prompt) {
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

	const req = http.request(options, (res) => {
		let responseData = '';

		res.on('data', (chunk) => {
			responseData += chunk;
		});

		res.on('end', () => {
			try {
				const responseJson = JSON.parse(responseData);
				console.log(responseJson.choices[0].message.content);
			} catch (error) {
				console.error(`Error parsing response: ${error.message}`);
			}
		});
	});

	req.on('error', (error) => {
		console.error(`Error: ${error.message}`);
	});

	req.write(data);
	req.end();
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