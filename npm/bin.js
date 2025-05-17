const os = require('os');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const pkg = require('./package.json');

const plat = os.platform();
const arch = os.arch();
const ver = pkg.version;
const name = `runz-${plat}-${arch}-v${ver}`;
const binary = path.join(__dirname, 'binary', name);

if (!fs.existsSync(binary)) {
	fs.rmSync(path.join(__dirname, 'binary'), { recursive: true, force: true });
	fs.mkdirSync(path.join(__dirname, 'binary'));
	const download = require('./download.js');
	download();
}

const args = process.argv.slice(2);

spawn(binary, args, {
	stdio: 'inherit',
	shell: plat === 'win32', // Use shell on Windows for better compatibility
}).unref();
