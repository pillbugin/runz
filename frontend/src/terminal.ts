import mitt, { type Emitter } from 'mitt';
import type { EventPayload, EventTypes, ServiceConfig } from './types';

type Handler<K extends keyof EventTypes> = (data: EventTypes[K]) => void;

export class Terminal {
  service: ServiceConfig;
  private emitter: Emitter<EventTypes>;
  private unsubscribe: () => void;
  private listenerMap: Map<string, { event: keyof EventTypes; fn: Handler<any> }>;

  constructor(service: ServiceConfig) {
    this.service = service;
    this.emitter = mitt<EventTypes>();
    this.listenerMap = new Map();

    const backendEventHandler = (event: EventPayload) => {
      this.emitter.emit(event.type, event.data);
    };

    window.backend.on(service.id, backendEventHandler);

    this.unsubscribe = () => {
      window.backend.off(service.id, backendEventHandler);
    };
  }

  on<K extends keyof EventTypes>(event: K, handler: Handler<K>) {
    this.emitter.on(event, handler);
  }

  off<K extends keyof EventTypes>(event: K, handler: Handler<K>) {
    this.emitter.off(event, handler);
  }

  once<K extends keyof EventTypes>(event: K, handler: Handler<K>) {
    const wrapped = (data: EventTypes[K]) => {
      this.emitter.off(event, wrapped);
      handler(data);
    };
    this.emitter.on(event, wrapped);
  }

  // Optional: On/Off with ID
  onWithId<K extends keyof EventTypes>(id: string, event: K, handler: Handler<K>) {
    this.listenerMap.set(id, { event, fn: handler });
    this.emitter.on(event, handler);
  }

  offById(id: string) {
    const entry = this.listenerMap.get(id);
    if (entry) {
      this.emitter.off(entry.event, entry.fn);
      this.listenerMap.delete(id);
    }
  }

  // Public terminal methods
  openLink(uri: string) {
    window.ipc.postMessage(JSON.stringify({
      id: this.service.id,
      event: {
        name: 'open_link',
        payload: uri,
      }
    }));
  }

  start() {
    window.ipc.postMessage(JSON.stringify({
      id: this.service.id,
      event: {
        name: 'start_terminal',
      }
    }));
  }

  stop() {
    window.ipc.postMessage(JSON.stringify({
      id: this.service.id,
      event: {
        name: 'stop_terminal',
      }
    }));
  }

  input(data: string) {
    window.ipc.postMessage(JSON.stringify({
      id: this.service.id,
      event: {
        name: 'input_terminal',
        payload: data,
      }
    }));
  }

  resize(data: { cols: number; rows: number }) {
    window.ipc.postMessage(JSON.stringify({
      id: this.service.id,
      event: {
        name: 'resize_terminal',
        payload: data,
      }
    }));
  }

  // Cleanup listener on destroy (if ever needed)
  dispose() {
    this.unsubscribe();
    for (const [id, entry] of this.listenerMap) {
      this.emitter.off(entry.event, entry.fn);
      this.listenerMap.delete(id);
    }
  }
}
