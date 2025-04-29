import { FitAddon } from "@xterm/addon-fit";
import { WebLinksAddon } from "@xterm/addon-web-links";
import { Terminal as XTermTerminal } from "@xterm/xterm";
import { PaintBucketIcon, PlayIcon, SquareIcon } from "lucide-react";
import { memo, useEffect, useRef, useState } from "react";
import { useIntersection, useWindowSize, useLocalStorage } from "react-use";
import { ansi } from "../utils/ansi";
import { Portal } from "./portal";
import { useXtermTheme } from "../hooks/use-xterm-theme";
import type { Terminal } from "../terminal";
import { getAccentColors, getTerminalTheme } from "../utils/color";

export type Props = {
	terminals: Terminal[]; // One or more terminal instances
	portalEl?: React.RefObject<HTMLDivElement | null>; // Element to mount control buttons into
	aggregated?: boolean; // Is this the global “All” terminal?
};

function Component(props: Props) {
	const [tabIsActive, setTabIsActive] = useState(false);
	const [isRunning, setIsRunning] = useState(false);

	// DOM + Xterm instance refs
	const terminalRef = useRef<HTMLDivElement>(document.createElement("div"));
	const xtermInstance = useRef<XTermTerminal | null>(null);
	const fitAddonInstance = useRef<FitAddon | null>(null);

	// User setting: whether to set terminal log colors by name
	const [sortedColors, setSortedColors] = useLocalStorage<boolean>(
		"sortedColors",
		false,
		{
			raw: false,
			serializer: (value) => value.toString(),
			deserializer: (value) => value === "true",
		},
	);

	// Responsive handling
	const windowSize = useWindowSize();
	const intersection = useIntersection(terminalRef, {
		root: null,
		rootMargin: "0px",
		threshold: 0.1,
	});

	// Sync the terminal’s theme with the app’s current theme
	const theme = useXtermTheme();

	// Accent colors used to label output per terminal
	const accentColors = useRef<Record<string, [string, string]>>({});

	// Initialize terminal and connect it to backend logic
	useEffect(() => {
		const fitAddon = new FitAddon();
		const webLinksAddon = new WebLinksAddon((_event, uri) =>
			props.terminals[0].openLink(uri),
		);

		const xterm = new XTermTerminal({
			cursorBlink: !props.aggregated,
			disableStdin: props.aggregated,
			cursorStyle: "underline",
		});

		xterm.options.theme = getTerminalTheme();

		xterm.loadAddon(fitAddon);
		xterm.loadAddon(webLinksAddon);

		const cleanupFns: (() => void)[] = [];

		for (const term of props.terminals) {
			// Only bind stdin for non-aggregated terminals
			if (!props.aggregated) {
				xterm.onData((data) => term.input(data));
			}

			xterm.onResize((size) => term.resize(size));

			const outputId = crypto.randomUUID();
			const stoppedId = crypto.randomUUID();
			const runningId = crypto.randomUUID();
			const errorId = crypto.randomUUID();

			let noHistory = true;

			term.onWithId(outputId, "output", (data: string) => {
				if (props.aggregated && noHistory) {
					const empty = data.trim().length === 0;
					const lineBreak = data.trim() === "\n";
					if (empty || lineBreak) return;
				}

				if (noHistory) noHistory = false;

				const [accentBg, accentFg] =
					accentColors.current[term.service.id] ?? getAccentColors();

				if (props.aggregated) {
					// Prefix each line with terminal label if in aggregated view
					xterm.write(
						`${ansi.bgHex(accentBg).hex(accentFg).italic(` ${term.service.name} `)} `,
					);
				}

				xterm.write(data);
			});

			term.onWithId(stoppedId, "stopped", () => {
				const [accentBg, accentFg] =
					accentColors.current[term.service.id] ?? getAccentColors();
				if (props.aggregated) {
					xterm.write(
						`${ansi.bgHex(accentBg).hex(accentFg).italic(` ${term.service.name} `)} `,
					);
					xterm.writeln(ansi.bgHex(accentBg).hex(accentFg).text(" ⏹ STOPPED "));
				} else {
					setIsRunning(false);
					xterm.options.disableStdin = false;
					xterm.writeln(ansi.bgHex(accentBg).hex(accentFg).text(" ⏹ STOPPED "));
				}
			});

			term.onWithId(runningId, "running", () => {
				const [accentBg, accentFg] =
					accentColors.current[term.service.id] ?? getAccentColors();
				if (props.aggregated) {
					xterm.write(
						`${ansi.bgHex(accentBg).hex(accentFg).italic(` ${term.service.name} `)} `,
					);
				} else {
					xterm.options.disableStdin = true;
					setIsRunning(true);
				}
			});

			term.onWithId(errorId, "error", (data: string) => {
				const [accentBg, accentFg] =
					accentColors.current[term.service.id] ?? getAccentColors();
				if (props.aggregated) {
					xterm.write(
						`${ansi.bgHex(accentBg).hex(accentFg).italic(` ${term.service.name} `)} `,
					);
					xterm.writeln(
						ansi.bgHex(accentBg).hex(accentFg).text(` ERROR: ${data} `),
					);
				} else {
					setIsRunning(false);
					xterm.writeln(
						ansi.bgHex(accentBg).hex(accentFg).text(` ERROR: ${data} `),
					);
				}
			});

			cleanupFns.push(() => {
				term.offById(outputId);
				term.offById(stoppedId);
				term.offById(runningId);
				term.offById(errorId);
			});

			// Mount the terminal UI into the DOM
			if (terminalRef.current) {
				xterm.open(terminalRef.current);
				// Small delay before starting to avoid race conditions
				setTimeout(() => {
					term.start();
				}, 500);
			}
		}

		// Prevent text input on aggregated terminals
		if (props.aggregated && xterm.textarea) {
			xterm.textarea.disabled = true;
		}

		xtermInstance.current = xterm;
		fitAddonInstance.current = fitAddon;

		return () => {
			xterm.dispose();
			xtermInstance.current = null;
			fitAddonInstance.current = null;
			for (const cleanupFn of cleanupFns) {
				cleanupFn();
			}
		};
	}, [props.terminals, props.aggregated]);

	// Auto-fit terminal when visible
	useEffect(() => {
		const isVisible = !!intersection?.isIntersecting;
		if (isVisible) {
			fitAddonInstance.current?.fit();
		}
		setTabIsActive(isVisible);
	}, [intersection]);

	// Refitting terminal on window resize
	// biome-ignore lint/correctness/useExhaustiveDependencies(windowSize): Should trigger fit on window size change
	useEffect(() => {
		const timeout = setTimeout(() => {
			fitAddonInstance.current?.fit();
		}, 300);
		return () => clearTimeout(timeout);
	}, [windowSize]);

	// Change xterm theme based on app theme
	useEffect(() => {
		// Exit early if no terminal is available yet
		if (!xtermInstance.current) return;

		xtermInstance.current.options.theme = theme;
	}, [theme]);

	// Recompute accent colors when theme or terminal list changes
	// biome-ignore lint/correctness/useExhaustiveDependencies(theme): Should refresh accent colors on theme change
	useEffect(() => {
		const colors: Record<string, [string, string]> = {};
		for (const term of props.terminals) {
			if (sortedColors) {
				colors[term.service.id] = getAccentColors(Number(term.service.id));
			} else {
				colors[term.service.id] = getAccentColors();
			}
		}
		accentColors.current = colors;
	}, [theme, props.terminals, sortedColors]);

	return (
		<>
			{/* Terminal container */}
			<div
				style={{ backgroundColor: theme?.background }}
				className="rounded-sm p-2 relative size-full"
			>
				<div className="size-full" ref={terminalRef} />
			</div>

			{/* Controls mounted into portal (e.g., bottom bar) */}
			<Portal container={props.portalEl?.current}>
				{/* Start/Stop button (only for individual terminals) */}
				{!props.aggregated && tabIsActive && (
					<button
						type="button"
						className="btn btn-circle btn-sm btn-ghost"
						onClick={() => {
							const method = isRunning ? "stop" : "start";
							props.terminals[0][method]();
						}}
					>
						{isRunning ? <SquareIcon size={16} /> : <PlayIcon size={16} />}
					</button>
				)}

				{/* Color-sorting toggle for the global tab */}
				{props.aggregated && tabIsActive && (
					<button
						type="button"
						className={[
							"btn",
							"btn-circle",
							"btn-sm",
							"btn-ghost",
							sortedColors ? "opacity-100" : "opacity-20",
							"hover:opacity-100",
						]
							.filter(Boolean)
							.join(" ")}
						onClick={() => {
							setSortedColors(!sortedColors);
						}}
					>
						<PaintBucketIcon size={16} />
					</button>
				)}
			</Portal>
		</>
	);
}

export const Xterm = memo(Component);
