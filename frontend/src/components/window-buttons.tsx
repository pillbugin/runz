import { useEffect, useMemo, useState } from "react";
import Color from "colorjs.io";
import { getColor } from "../utils/color";
import { useEvent, useMedia } from "react-use";

type BtnType = "close" | "minimize" | "maximize";

export function WindowButtons() {
	const [hovering, setHovering] = useState(false);
	const [focused, setFocused] = useState(true);

	const prefersContrast = useMedia("(prefers-contrast: more)");
	const prefersReducedMotion = useMedia("(prefers-reduced-motion: reduce)");

	useEvent("window_focused", (event: Event) => {
		setFocused((event as CustomEvent<boolean>).detail);
	});

	return (
		<div
			className="window-buttons flex gap-[8px] px-[12px] mt-[-4px]"
			onMouseEnter={() => setHovering(true)}
			onMouseLeave={() => setHovering(false)}
		>
			<WindowButton
				type="close"
				hovering={prefersReducedMotion || hovering}
				focused={focused}
				prefersContrast={prefersContrast}
				onPress={() => {
					window.ipc.postMessage(
						JSON.stringify({
							id: "",
							event: {
								name: "close_window",
							},
						}),
					);
				}}
			/>
			<WindowButton
				type="minimize"
				hovering={prefersReducedMotion || hovering}
				focused={focused}
				prefersContrast={prefersContrast}
				onPress={() => {
					window.ipc.postMessage(
						JSON.stringify({
							id: "",
							event: {
								name: "minimize_window",
							},
						}),
					);
				}}
			/>
			<WindowButton
				type="maximize"
				hovering={prefersReducedMotion || hovering}
				focused={focused}
				prefersContrast={prefersContrast}
				onPress={() => {
					window.ipc.postMessage(
						JSON.stringify({
							id: "",
							event: {
								name: "maximize_window",
							},
						}),
					);
				}}
			/>
		</div>
	);
}

function WindowButton(props: {
	type: BtnType;
	hovering: boolean;
	focused: boolean;
	prefersContrast: boolean;
	onPress: () => void;
}) {
	const [pressing, setPressing] = useState(false);
	const [theme, setTheme] = useState("");

	// biome-ignore lint/correctness/useExhaustiveDependencies(theme): Theme changes should recalculate accent colors
	const colors = useMemo(() => {
		const colorName = colorNames[props.type];
		const bg = new Color(getColor(`--color-${colorName}`, "#000"));
		const fg = new Color(getColor(`--color-${colorName}-content`, "#fff"));

		if (!props.focused || (props.prefersContrast && !props.hovering)) {
			const base = new Color(getColor("--color-bg-base-300", "#fff"));
			const muted = new Color(base.l > 0.8 ? "#000" : "#fff");
			muted.alpha = 0.15;
			return {
				background: muted.toString(),
				foreground: muted.toString(),
				border: muted.toString(),
			};
		}

		if (pressing) {
			bg.lighten(0.15);
			fg.lighten(0.15);
		}

		if (!props.prefersContrast) {
			fg.alpha = 0.5;
		}

		return {
			background: bg.toString(),
			foreground: fg.toString(),
			border: bg.clone().darken(0.1).toString(),
		};
	}, [
		pressing,
		props.focused,
		props.type,
		props.hovering,
		props.prefersContrast,
		theme,
	]);

	useEffect(() => {
		const observer = new MutationObserver(() => {
			setTheme(document.documentElement.getAttribute("data-theme") ?? "");
		});

		observer.observe(document.documentElement, {
			attributes: true,
			attributeFilter: ["data-theme"],
		});

		return () => observer.disconnect();
	}, []);

	return (
		<button
			type="button"
			className="size-[12px]"
			aria-label={labels[props.type]}
			onMouseDown={() => setPressing(true)}
			onMouseUp={() => setPressing(false)}
			onMouseOut={() => setPressing(false)}
			onBlur={() => setPressing(false)}
			onClick={props.onPress}
			onKeyDown={(event) => {
				if (event.key === "Enter") {
					props.onPress();
				}
			}}
			onKeyUp={(event) => {
				if (event.key === "Enter") {
					props.onPress();
				}
			}}
		>
			<svg
				enableBackground="new 0 0 85.4 85.4"
				viewBox="0 0 85.4 85.4"
				xmlns="http://www.w3.org/2000/svg"
			>
				<title>Close</title>
				<g clipRule="evenodd" fillRule="evenodd">
					<path
						d="m42.7 85.4c23.6 0 42.7-19.1 42.7-42.7s-19.1-42.7-42.7-42.7-42.7 19.1-42.7 42.7 19.1 42.7 42.7 42.7z"
						fill={colors.border}
					/>
					<path
						d="m42.7 81.8c21.6 0 39.1-17.5 39.1-39.1s-17.5-39.1-39.1-39.1-39.1 17.5-39.1 39.1 17.5 39.1 39.1 39.1z"
						fill={colors.background}
					/>

					{props.hovering && (
						<>
							{props.type === "close" && (
								<g fill={colors.foreground}>
									<path d="m22.5 57.8 35.3-35.3c1.4-1.4 3.6-1.4 5 0l.1.1c1.4 1.4 1.4 3.6 0 5l-35.3 35.3c-1.4 1.4-3.6 1.4-5 0l-.1-.1c-1.3-1.4-1.3-3.6 0-5z" />
									<path d="m27.6 22.5 35.3 35.3c1.4 1.4 1.4 3.6 0 5l-.1.1c-1.4 1.4-3.6 1.4-5 0l-35.3-35.3c-1.4-1.4-1.4-3.6 0-5l.1-.1c1.4-1.3 3.6-1.3 5 0z" />
								</g>
							)}

							{props.type === "minimize" && (
								<path
									d="m17.8 39.1h49.9c1.9 0 3.5 1.6 3.5 3.5v.1c0 1.9-1.6 3.5-3.5 3.5h-49.9c-1.9 0-3.5-1.6-3.5-3.5v-.1c0-1.9 1.5-3.5 3.5-3.5z"
									fill={colors.foreground}
								/>
							)}

							{props.type === "maximize" && (
								<path
									d="m31.2 20.8h26.7c3.6 0 6.5 2.9 6.5 6.5v26.7zm23.2 43.7h-26.8c-3.6 0-6.5-2.9-6.5-6.5v-26.8z"
									transform="scale(-1, 1) translate(-85.4, 0)"
									fill={colors.foreground}
								/>
							)}
						</>
					)}
				</g>
			</svg>
		</button>
	);
}

const colorNames = {
	close: "error",
	minimize: "warning",
	maximize: "success",
};

const labels = {
	close: "Close window",
	minimize: "Minimize window",
	maximize: "Maximize window",
};
