import axios, { AxiosInstance } from 'axios';
import { ClickUpConfig, ClickUpTask, ClickUpList, ClickUpSpace } from '../types/index.js';
import { Logger } from '../utils/config.js';

/**
 * Service for interacting with ClickUp API
 */
export class ClickUpService {
  private config: ClickUpConfig;
  private logger: Logger;
  private client: AxiosInstance;

  constructor(config: ClickUpConfig, logger: Logger) {
    this.config = config;
    this.logger = logger;
    
    this.client = axios.create({
      baseURL: config.baseUrl,
      timeout: 30000,
      headers: {
        'Authorization': config.apiKey,
        'Content-Type': 'application/json',
      },
    });
  }

  /**
   * Get all spaces in the workspace
   */
  async getSpaces(): Promise<ClickUpSpace[]> {
    try {
      this.logger.info('Fetching ClickUp spaces');
      
      if (!this.config.apiKey) {
        this.logger.warn('No ClickUp API key configured. Returning empty spaces.');
        return [];
      }

      const response = await this.client.get(`/team/${this.config.workspaceId}/space`);
      return response.data.spaces || [];
    } catch (error) {
      this.logger.error('Error fetching spaces:', error);
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        throw new Error('Invalid ClickUp API key. Please check your CLICKUP_API_KEY environment variable.');
      }
      throw error;
    }
  }

  /**
   * Get all lists in a space
   */
  async getLists(spaceId: string): Promise<ClickUpList[]> {
    try {
      this.logger.info(`Fetching lists for space: ${spaceId}`);
      
      if (!this.config.apiKey) {
        this.logger.warn('No ClickUp API key configured. Returning empty lists.');
        return [];
      }

      const response = await this.client.get(`/space/${spaceId}/list`);
      return response.data.lists || [];
    } catch (error) {
      this.logger.error('Error fetching lists:', error);
      throw error;
    }
  }

  /**
   * Create a task in ClickUp
   */
  async createTask(listId: string, task: ClickUpTask): Promise<ClickUpTask> {
    try {
      this.logger.info(`Creating task in list ${listId}: ${task.name}`);
      
      if (!this.config.apiKey) {
        throw new Error('ClickUp API key not configured. Cannot create task.');
      }

      const response = await this.client.post(`/list/${listId}/task`, {
        name: task.name,
        description: task.description,
        status: task.status || 'to do',
        priority: task.priority,
        assignees: task.assignees,
        tags: task.tags,
        due_date: task.dueDate,
      });

      this.logger.info(`Task created successfully: ${response.data.id}`);
      return {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        status: response.data.status?.status,
        priority: response.data.priority?.id,
      };
    } catch (error) {
      this.logger.error('Error creating task:', error);
      if (axios.isAxiosError(error)) {
        throw new Error(`Failed to create ClickUp task: ${error.response?.data?.err || error.message}`);
      }
      throw error;
    }
  }

  /**
   * Update an existing task
   */
  async updateTask(taskId: string, updates: Partial<ClickUpTask>): Promise<ClickUpTask> {
    try {
      this.logger.info(`Updating task: ${taskId}`);
      
      if (!this.config.apiKey) {
        throw new Error('ClickUp API key not configured. Cannot update task.');
      }

      const payload: any = {};
      if (updates.name) payload.name = updates.name;
      if (updates.description) payload.description = updates.description;
      if (updates.status) payload.status = updates.status;
      if (updates.priority !== undefined) payload.priority = updates.priority;
      if (updates.assignees) payload.assignees = updates.assignees;
      if (updates.tags) payload.tags = updates.tags;
      if (updates.dueDate) payload.due_date = updates.dueDate;

      const response = await this.client.put(`/task/${taskId}`, payload);

      this.logger.info(`Task updated successfully: ${taskId}`);
      return {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        status: response.data.status?.status,
      };
    } catch (error) {
      this.logger.error('Error updating task:', error);
      throw error;
    }
  }

  /**
   * Get task by ID
   */
  async getTask(taskId: string): Promise<ClickUpTask | null> {
    try {
      this.logger.info(`Fetching task: ${taskId}`);
      
      if (!this.config.apiKey) {
        this.logger.warn('No ClickUp API key configured.');
        return null;
      }

      const response = await this.client.get(`/task/${taskId}`);
      return {
        id: response.data.id,
        name: response.data.name,
        description: response.data.description,
        status: response.data.status?.status,
        priority: response.data.priority?.id,
        assignees: response.data.assignees?.map((a: any) => a.id),
        tags: response.data.tags?.map((t: any) => t.name),
      };
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 404) {
        return null;
      }
      this.logger.error('Error fetching task:', error);
      throw error;
    }
  }

  /**
   * Search for tasks by name or description
   */
  async searchTasks(listId: string, searchTerm: string): Promise<ClickUpTask[]> {
    try {
      this.logger.info(`Searching tasks in list ${listId} for: ${searchTerm}`);
      
      if (!this.config.apiKey) {
        this.logger.warn('No ClickUp API key configured.');
        return [];
      }

      const response = await this.client.get(`/list/${listId}/task`, {
        params: {
          subtasks: false,
        },
      });

      const tasks = response.data.tasks || [];
      const filtered = tasks.filter((task: any) => 
        task.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );

      return filtered.map((task: any) => ({
        id: task.id,
        name: task.name,
        description: task.description,
        status: task.status?.status,
        priority: task.priority?.id,
      }));
    } catch (error) {
      this.logger.error('Error searching tasks:', error);
      throw error;
    }
  }

  /**
   * Test connection to ClickUp API
   */
  async testConnection(): Promise<boolean> {
    try {
      this.logger.info('Testing connection to ClickUp API');
      
      if (!this.config.apiKey) {
        this.logger.error('ClickUp API key not configured');
        return false;
      }

      await this.client.get('/user');
      this.logger.info('Successfully connected to ClickUp');
      return true;
    } catch (error) {
      this.logger.error('Connection test failed:', error);
      if (axios.isAxiosError(error)) {
        if (error.response?.status === 401) {
          this.logger.error('Authentication failed. Check your CLICKUP_API_KEY.');
        }
      }
      return false;
    }
  }
}
