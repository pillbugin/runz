import type { ITheme } from '@xterm/xterm';
import Color from 'colorjs.io';

export const tailwindBgHex700 = [
	'#1d4ed8', // blue-700
	'#0f766e', // teal-700
	'#6d28d9', // violet-700
	'#c2410c', // orange-700
	'#0369a1', // sky-700
	'#a21caf', // fuchsia-700
	'#4d7c0f', // lime-700
	'#4338ca', // indigo-700
	'#be185d', // pink-700
	'#15803d', // green-700
	'#0e7490', // cyan-700
	'#be123c', // rose-700
	'#b45309', // amber-700
	'#6b21a8', // purple-700
	'#047857', // emerald-700
	'#374151', // gray-700
	'#a16207', // yellow-700
	'#b91c1c', // red-700
];

/**
 * Get a pair of accent colors for the terminal (background, foreground).
 * Uses deterministic colors if `idx` is given, otherwise theme-derived colors.
 */
export function getAccentColors(idx?: number): [string, string] {
	if (idx !== undefined) {
		return [tailwindBgHex700[idx] ?? 'bg-black', '#ffffff'];
	}

	const bg = new Color(getColor('--color-base-content', '#ffffff'))
		.to('srgb')
		.toString({ format: 'hex' });

	const fg = new Color(getColor('--color-base-200', '#000000'))
		.to('srgb')
		.toString({ format: 'hex' });

	return [bg, fg];
}

/**
 * Helper to extract a CSS variable, falling back to a default if not found.
 */
export function getColor(varName: string, fallback: string): string {
	return (
		getComputedStyle(document.documentElement)
			.getPropertyValue(varName)
			?.trim() || fallback
	);
}

/**
 * Build a theme object using current CSS custom properties and apply it to the terminal.
 */
export function getTerminalTheme(): ITheme {
	return {
		background: getColor('--color-base-200', '#ffffff'),
		foreground: getColor('--color-base-content', '#1f2937'),
		cursor: getColor('--color-base-content', '#1f2937'),
		selectionBackground: getColor('--color-base-300', '#93c5fd44'),
		selectionForeground: getColor('--color-base-content', '#1f2937'),
		selectionInactiveBackground: getColor('--color-base-300', '#1f2937'),
	};
}
