import {writable} from 'svelte/store';

export interface OperationStatus {
  isRunning: boolean;
  currentStep: string;
  progress: number;
  logs: string[];
  error?: string;
  result?: any;
}

export const operationStatus = writable<OperationStatus>({
  isRunning: false,
  currentStep: '',
  progress: 0,
  logs: [],
});

export function updateOperationStatus(update: Partial<OperationStatus>) {
  operationStatus.update(current => ({
    ...current,
    ...update,
  }));
}

export function addLog(message: string) {
  operationStatus.update(current => ({
    ...current,
    logs: [...current.logs, message],
  }));
}

export function resetOperation() {
  operationStatus.set({
    isRunning: false,
    currentStep: '',
    progress: 0,
    logs: [],
  });
}
