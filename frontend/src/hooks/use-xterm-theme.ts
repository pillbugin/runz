import type { ITheme } from '@xterm/xterm';
import { useEffect, useState } from 'react';
import { getTerminalTheme } from '../utils/color';

export function useXtermTheme() {
	const [theme, setTheme] = useState<ITheme | undefined>();

	useEffect(() => {
		setTheme(getTerminalTheme());

		// Watch for theme changes via mutation on `data-theme` attribute
		const observer = new MutationObserver(() => {
			setTheme(getTerminalTheme());
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ['data-theme'],
		});

		// Cleanup: disconnect observer when component unmounts or term changes
		return () => observer.disconnect();
	}, []);

	return theme;
}
