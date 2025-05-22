
import type { Task, TaskStatus } from '@/components/tasks/TaskItem';

const API_BASE_URL = '/api'; // Adjust if your API is hosted elsewhere

export async function fetchTasks(): Promise<Task[]> {
  const response = await fetch(`${API_BASE_URL}/tasks`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to fetch tasks and could not parse error.' }));
    throw new Error(errorData.error || 'Failed to fetch tasks');
  }
  return response.json();
}

export async function fetchTask(taskId: string): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`);
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `Failed to fetch task ${taskId} and could not parse error.` }));
    if (response.status === 404) throw new Error('Task not found');
    throw new Error(errorData.error || `Failed to fetch task ${taskId}`);
  }
  return response.json();
}

// Ensure the type matches what the API expects (no id, createdAt, updatedAt for new task)
export async function createTask(taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: 'Failed to create task and could not parse error.' }));
    throw new Error(errorData.error || 'Failed to create task');
  }
  return response.json();
}

export async function updateTask(taskId: string, taskData: Partial<Omit<Task, 'id' | 'createdAt' | 'updatedAt'>>): Promise<Task> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(taskData),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ message: `Failed to update task ${taskId} and could not parse error.` }));
    if (response.status === 404) throw new Error('Task not found for update');
    throw new Error(errorData.error || `Failed to update task ${taskId}`);
  }
  return response.json();
}

export async function deleteTask(taskId: string): Promise<{ message: string }> {
  const response = await fetch(`${API_BASE_URL}/tasks/${taskId}`, {
    method: 'DELETE',
  });
  if (!response.ok) {
     const errorData = await response.json().catch(() => ({ message: `Failed to delete task ${taskId} and could not parse error.` }));
    if (response.status === 404) throw new Error('Task not found for deletion');
    throw new Error(errorData.error || `Failed to delete task ${taskId}`);
  }
  return response.json();
}
