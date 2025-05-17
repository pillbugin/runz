const os = require('os');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { URL } = require('url');
const pkg = require('./package.json');

const plat = os.platform();
const arch = os.arch();
const ver = pkg.version;
const repo = pkg.repository.url.replace(/^git\+/, '').replace(/\.git$/, '');
const name = `runz-${plat}-${arch}-v${ver}`;
const url = `${repo}/releases/download/v${ver}/${name}.zip`;

// Check if file exists on GitHub first
function checkFileExists(url, callback) {
	const req = https.request(url, { method: 'HEAD' }, (res) => {
		callback(res.statusCode >= 200 && res.statusCode < 400);
	});

	req.on('error', (err) => {
		console.error('❌ Error checking file:', err.message);
		callback(false);
	});

	req.end();
}

// Download with redirect handling
function downloadWithRedirect(url, destination, maxRedirects = 5) {
	if (maxRedirects <= 0) {
		console.error('❌ Too many redirects.');
		process.exit(1);
	}

	const req = https.get(url, (res) => {
		if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
			const redirectUrl = new URL(res.headers.location, url).toString(); // Handle relative
			downloadWithRedirect(redirectUrl, destination, maxRedirects - 1);
			return;
		}

		if (res.statusCode < 200 || res.statusCode >= 400) {
			console.error(`❌ Failed to download binary. HTTP ${res.statusCode}`);
			process.exit(1);
		}

		const fileStream = fs.createWriteStream(destination);
		res.pipe(fileStream);

		fileStream.on('finish', () => {
			fileStream.close(() => {
				const stats = fs.statSync(destination);
				if (stats.size < 1024) {
					console.error('❌ Downloaded file seems too small or invalid.');
					process.exit(1);
				}

				const firstChunk = fs
					.readFileSync(destination, { encoding: 'utf8' })
					.slice(0, 100);
				if (firstChunk.includes('<!DOCTYPE html')) {
					console.error('❌ Downloaded file is HTML, not a ZIP.');
					process.exit(1);
				}

				try {
					const unpackDir = path.join(__dirname, 'binary');
					if (!fs.existsSync(unpackDir)) {
						fs.mkdirSync(unpackDir, { recursive: true });
					}
					execSync(`unzip -o ${destination} -d ${unpackDir}`);
					fs.unlinkSync(destination);
				} catch (err) {
					console.error('❌ Failed to unzip:', err);
					process.exit(1);
				}
			});
		});
	});

	req.on('error', (err) => {
		console.error('❌ Download error:', err.message);
		process.exit(1);
	});
}

export default function download() {
	checkFileExists(url, (exists) => {
		if (!exists) {
			console.error(
				`🚫 No pre-built assets available for platform "${plat}" and arch "${arch}".`,
			);
			process.exit(1);
		}

		console.log(`⬇️ Downloading: ${name}.zip`);
		downloadWithRedirect(url, path.join(__dirname, 'binary', `${name}.zip`));
	});
}
