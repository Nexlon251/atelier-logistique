import type { Task, TaskWindow } from '../types/models';

const DAY_IN_MS = 1000 * 60 * 60 * 24;

function toUtcDateStart(value: Date | string): number {
  const date = typeof value === 'string' ? new Date(value) : new Date(value);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

export function getWindowLength(window: TaskWindow): number {
  return window === 'semaine' ? 7 : 31;
}

export function getDayDelta(value: string, now = new Date()): number {
  return Math.floor((toUtcDateStart(value) - toUtcDateStart(now)) / DAY_IN_MS);
}

export function isTaskInWindow(task: Task, window: TaskWindow, now = new Date()): boolean {
  const delta = getDayDelta(task.dueDate, now);
  if (task.status !== 'terminee' && delta < 0) {
    return true;
  }

  return delta <= getWindowLength(window);
}

export function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort(
    (firstTask, secondTask) =>
      new Date(firstTask.dueDate).getTime() - new Date(secondTask.dueDate).getTime()
  );
}

export function countOverdueTasks(tasks: Task[], now = new Date()): number {
  return tasks.filter(
    (task) => task.status !== 'terminee' && getDayDelta(task.dueDate, now) < 0
  ).length;
}

export function countCompletedTasks(tasks: Task[]): number {
  return tasks.filter((task) => task.status === 'terminee').length;
}
