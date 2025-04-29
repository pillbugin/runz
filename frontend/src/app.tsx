import { Fragment, useRef } from 'react';
import { LogsIcon } from 'lucide-react';
import { ThemeSelector } from './components/theme-selector';
import { Xterm } from './components/xterm';
import { WindowButtons } from './components/window-buttons';

export default function App() {
  // DOM reference for buttons rendering
  const portalEl = useRef(null);

  return (
    <div className="h-screen w-screen overflow-hidden">
      {/* Tab layout container */}
      <div className="tabs tabs-lift flex rounded-none pt-1 bg-base-300 relative w-full h-[calc(100%-10vh)] select-none">
        {/* Placeholder div for alignment/styling */}
				<div className="title-bar min-w-50 grow flex justify-left items-center">
		      <WindowButtons />
				</div>

        {/* One tab + terminal per command */}
        {Object.values(window.terminals).map((terminal) => (
          <Fragment key={terminal.service.id}>
            <input
              type="radio"
              name="tab"
              className="tab border-none"
              aria-label={terminal.service.name}
            />
            <div className="tab-content size-full border-none bg-base-100 border-base-300 p-6 rounded-none">
              <Xterm terminals={[terminal]} portalEl={portalEl} />
            </div>
          </Fragment>
        ))}

        {/* Global "All" tab that aggregates all terminal logs */}
        <label className="tab border-none mr-1">
          <input type="radio" name="tab" defaultChecked />
          <LogsIcon size={15} className="mr-1" />
          All
        </label>
        <div className="tab-content size-full border-none bg-base-100 border-base-300 p-6 rounded-none">
          <Xterm
            terminals={Object.values(window.terminals)} // All terminals passed in
            portalEl={portalEl}
            aggregated // Special behavior for global log view
          />
        </div>
      </div>

      {/* Bottom bar with theme selector and portal mount point */}
      <div className="flex py-1 justify-between items-center bg-base-300 px-2 h-auto absolute bottom-0 w-full">
        <div ref={portalEl} />
        <ThemeSelector />
      </div>
    </div>
  );
}
