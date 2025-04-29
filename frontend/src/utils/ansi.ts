function hexToRgb(h: string): [number, number, number] {
	let hex = h.replace(/^#/, '');
	if (hex.length === 3) {
		hex = hex
			.split('')
			.map((c) => c + c)
			.join('');
	}
	const bigint = Number.parseInt(hex, 16);
	return [(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

function ansiFg(rgb: [number, number, number]) {
	const [r, g, b] = rgb;
	return `\x1b[38;2;${r};${g};${b}m`;
}

function ansiBg(rgb: [number, number, number]) {
	const [r, g, b] = rgb;
	return `\x1b[48;2;${r};${g};${b}m`;
}

function ansiItalic() {
	return '\x1b[3m';
}

function ansiReset() {
	return '\x1b[0m';
}

export const ansi = {
	bgHex(bg: string) {
		const bgRgb = hexToRgb(bg);
		return {
			hex(fg: string) {
				const fgRgb = hexToRgb(fg);
				const bgCode = ansiBg(bgRgb);
				const fgCode = ansiFg(fgRgb);
				return {
					italic(text: string) {
						return `${bgCode}${fgCode}${ansiItalic()}${text}${ansiReset()}`;
					},
					text(text: string) {
						return `${bgCode}${fgCode}${text}${ansiReset()}`;
					},
				};
			},
		};
	},
};
