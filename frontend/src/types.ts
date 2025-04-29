import type { Emitter } from "mitt";
import type { Terminal } from "./terminal";

export type ServiceConfig = {
  id: string;
  prog: string;
  args?: string[];
  wdir?: string;
  name?: string;
};

export type Config = {
  name?: string;
  services: ServiceConfig[];
};

export type EventTypes = {
  running: undefined;
  stopped: undefined;
  output: string;
  error: string;
};

export type EventPayload = {
  type: keyof EventTypes;
  data: EventTypes[keyof EventTypes];
};

declare global {
  interface Window {
    backend: Emitter<Record<string, EventPayload>>;
    config: Config;
    terminals: Terminal[];
    ipc: {
      postMessage: (message: string) => void;
    };
  }
}
