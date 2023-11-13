const vscode = require('vscode');
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
	// This line of code will only be executed once when your extension is activated
	console.log('Congratulations, your extension "llcc" is now active!');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposableHelloWorld = vscode.commands.registerCommand('llcc.helloWorld', function () {
		// Display a message box to the user
		vscode.window.showInformationMessage('sup nigga');
	});

	let disposableStartServer = vscode.commands.registerCommand('llcc.startServer', function () {
		vscode.window.showInformationMessage('Starting LLaMA Server...');

		// Define the path to the conda executable
		// This path might change depending on your installation
		const condaBasePath = '/home/rafael/mambaforge/bin/';

		// Define the path to the models directory relative to the current extension directory
		const modelsPath = '/home/rafael/ml/llama.cpp/models';

		// Define the path to the log file
		const logFilePath = path.join(context.extensionPath, 'server.log');

		// Create a write stream for logging
		const logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
		logStream.write(`\n\nStarting server at ${new Date().toISOString()}\n`);

		// Construct the command to activate conda and start the server
		const command = `bash -c "source '${condaBasePath}activate' 'llm_inference' && cd '${modelsPath}' && python3 -m llama_cpp.server --model mistral-7b-instruct-v0.1.Q4_K_M.gguf --n_gpu_layers 35"`;


		// Execute the command
		const serverProcess = spawn(command, { shell: true });


		// Pipe the server process stdout and stderr to the log file
		serverProcess.stdout.pipe(logStream);
		serverProcess.stderr.pipe(logStream);

		serverProcess.on('close', (code) => {
			logStream.write(`Server process exited with code ${code} at ${new Date().toISOString()}\n`);
			logStream.end(); // Close the stream

			console.log(`Server process exited with code ${code}`);
			if (code === 0) {
				vscode.window.showInformationMessage('Server started successfully.');
			} else {
				vscode.window.showErrorMessage(`Server exited with error code ${code}.`);
			}
		});
	});

	context.subscriptions.push(disposableStartServer);
}

// 	serverProcess.stdout.on('data', (data) => {
// 		console.log(`Server: ${data}`);
// 	});

// 	serverProcess.stderr.on('data', (data) => {
// 		console.error(`Server Error: ${data}`);
// 	});

// 	serverProcess.on('close', (code) => {
// 		console.log(`Server process exited with code ${code}`);
// 	});
// });


function deactivate() { }

module.exports = {
	activate,
	deactivate
};