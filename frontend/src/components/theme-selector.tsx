import { PaletteIcon } from "lucide-react";
import { capitalize } from "radashi";
import { useEffect, useRef } from "react";
import { themeChange } from "theme-change";

const themes = [
	"light",
	"dark",
	"cupcake",
	"bumblebee",
	"emerald",
	"corporate",
	"synthwave",
	"retro",
	"cyberpunk",
	"valentine",
	"halloween",
	"garden",
	"forest",
	"aqua",
	"lofi",
	"pastel",
	"fantasy",
	"wireframe",
	"black",
	"luxury",
	"dracula",
	"cmyk",
	"autumn",
	"business",
	"acid",
	"lemonade",
	"night",
	"coffee",
	"winter",
	"dim",
	"nord",
	"sunset",
	"caramelatte",
	"abyss",
	"silk",
];

export function ThemeSelector() {
	const dialogRef = useRef<HTMLDialogElement | null>(null);

	useEffect(() => {
		themeChange(false);
	}, []);

	return (
		<>
			<button
				type="button"
				className="btn btn-circle btn-sm btn-ghost"
				onClick={() => dialogRef.current?.showModal()}
			>
				<PaletteIcon size={16} />
			</button>
			<dialog ref={dialogRef} className="modal">
				<div className="modal-box w-3/4 max-w-5xl">
					<h3 className="font-bold text-lg">Select Theme</h3>

					<div className="grid grid-cols-5 gap-4 mt-4">
						{themes.map((theme) => (
							<button
								key={theme}
								type="button"
								className="cursor-pointer flex items-center justify-center p-1 rounded-sm shadow-md bg-base-200 hover:bg-base-300 transition-all duration-300"
								data-set-theme={theme}
								data-act-class="theme-btn-active"
							>
								{capitalize(theme)}
							</button>
						))}
					</div>

					<div className="modal-action">
						<form method="dialog">
							<button type="submit" className="btn">
								Close
							</button>
						</form>
					</div>
				</div>
			</dialog>
		</>
	);
}
