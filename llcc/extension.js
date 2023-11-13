const vscode = require('vscode');
const { spawn, exec } = require('child_process');
const fs = require('fs');
const path = require('path');

let serverProcess = null;
let serverRunning = false;
let logStream = null;

function activate(context) {
	// Define the path to the log file
	const logFilePath = path.join(context.extensionPath, 'server.log');

	// Define the path to the conda executable and models directory
	const condaBasePath = '/home/rafael/mambaforge/bin/';
	const modelsPath = '/home/rafael/ml/llama.cpp/models';

	// Construct the command to activate conda and start the server
	const command = `bash -c "source '${condaBasePath}activate' 'llm_inference' && cd '${modelsPath}' && python3 -m llama_cpp.server --model mistral-7b-instruct-v0.1.Q4_K_M.gguf --n_gpu_layers 35"`;

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
			logStream = fs.createWriteStream(logFilePath, { flags: 'a' });
			logStream.write(`\nStarting server at ${new Date().toISOString()}\n`);
			serverProcess = spawn(command, { shell: true });
			serverProcess.stdout.pipe(logStream);
			serverProcess.stderr.pipe(logStream);

			serverProcess.on('close', code => {
				logStream.write(`Server process exited with code ${code} at ${new Date().toISOString()}\n`);
				logStream.end();
				serverRunning = false;
			});

			serverRunning = true;
			vscode.window.showInformationMessage('Server started.');
		}
	});

	context.subscriptions.push(disposableToggleServer);
}

function deactivate() {
	// Add logic here to stop the server when the extension is deactivated
	if (serverRunning) {
		// Try to stop the server using the PID from lsof
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
