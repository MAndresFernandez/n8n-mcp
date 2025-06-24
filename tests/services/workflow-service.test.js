import nock from 'nock';
import {
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  activateWorkflow,
  deactivateWorkflow,
  deleteWorkflow
} from '../../services/workflow-service.js';

const N8N_BASE_URL = 'http://localhost:5678';
const API_BASE_URL = `${N8N_BASE_URL}/api/v1`;

describe('Workflow Service', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('listWorkflows', () => {
    it('should return list of workflows', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            name: 'Test Workflow 1',
            active: true,
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z'
          },
          {
            id: '2',
            name: 'Test Workflow 2',
            active: false,
            createdAt: '2023-01-02T00:00:00.000Z',
            updatedAt: '2023-01-02T00:00:00.000Z'
          }
        ],
        nextCursor: null
      };

      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 50 })
        .reply(200, mockResponse);

      const result = await listWorkflows({ limit: 50 });

      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].name).toBe('Test Workflow 1');
    });

    it('should handle API errors', async () => {
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 50 })
        .reply(401, { message: 'Unauthorized' });

      await expect(listWorkflows({ limit: 50 })).rejects.toThrow();
    });
  });

  describe('getWorkflow', () => {
    it('should return specific workflow', async () => {
      const mockWorkflow = {
        id: '1',
        name: 'Test Workflow',
        active: true,
        nodes: [
          {
            id: 'trigger',
            name: 'Manual Trigger',
            type: 'n8n-nodes-base.manualTrigger',
            position: [240, 300]
          }
        ],
        connections: {},
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };

      nock(API_BASE_URL)
        .get('/workflows/1')
        .reply(200, mockWorkflow);

      const result = await getWorkflow('1');

      expect(result).toEqual(mockWorkflow);
      expect(result.id).toBe('1');
      expect(result.name).toBe('Test Workflow');
    });

    it('should throw error for missing workflowId', async () => {
      await expect(getWorkflow()).rejects.toThrow('workflowId is required');
    });
  });

  describe('createWorkflow', () => {
    it('should create new workflow', async () => {
      const workflowData = {
        name: 'New Test Workflow',
        nodes: [
          {
            id: 'trigger',
            name: 'Manual Trigger',
            type: 'n8n-nodes-base.manualTrigger',
            position: [240, 300]
          }
        ],
        connections: {}
      };

      const mockResponse = {
        id: '3',
        name: 'New Test Workflow',
        active: false,
        ...workflowData,
        createdAt: '2023-01-03T00:00:00.000Z',
        updatedAt: '2023-01-03T00:00:00.000Z'
      };

      nock(API_BASE_URL)
        .post('/workflows', {
          name: workflowData.name,
          nodes: workflowData.nodes,
          connections: workflowData.connections,
          settings: {}
        })
        .reply(201, mockResponse);

      const result = await createWorkflow(workflowData);

      expect(result).toEqual(mockResponse);
      expect(result.id).toBe('3');
      expect(result.name).toBe('New Test Workflow');
    });

    it('should validate required fields', async () => {
      await expect(createWorkflow({})).rejects.toThrow('Name and nodes array are required');
      await expect(createWorkflow({ name: 'Test' })).rejects.toThrow('Name and nodes array are required');
      await expect(createWorkflow({ name: 'Test', nodes: [] })).rejects.toThrow('Name and nodes array are required');
    });
  });

  describe('updateWorkflow', () => {
    it('should update existing workflow', async () => {
      const currentWorkflow = {
        id: '1',
        name: 'Original Name',
        active: false,
        nodes: [],
        connections: {},
        createdAt: '2023-01-01T00:00:00.000Z',
        updatedAt: '2023-01-01T00:00:00.000Z'
      };

      const updates = {
        name: 'Updated Name'
      };

      const mockResponse = {
        ...currentWorkflow,
        ...updates,
        updatedAt: '2023-01-03T00:00:00.000Z'
      };

      nock(API_BASE_URL)
        .get('/workflows/1')
        .reply(200, currentWorkflow);

      nock(API_BASE_URL)
        .put('/workflows/1')
        .reply(200, mockResponse);

      const result = await updateWorkflow('1', updates);

      expect(result).toEqual(mockResponse);
      expect(result.name).toBe('Updated Name');
    });

    it('should throw error for missing workflowId', async () => {
      await expect(updateWorkflow()).rejects.toThrow('workflowId is required');
    });
  });

  describe('activateWorkflow', () => {
    it('should activate workflow using specific endpoint', async () => {
      const mockResponse = {
        data: { id: '1', active: true }
      };

      nock(API_BASE_URL)
        .post('/workflows/1/activate')
        .reply(200, mockResponse);

      const result = await activateWorkflow('1');

      expect(result).toEqual(mockResponse);
    });

    it('should fallback to update method if activate endpoint not found', async () => {
      const currentWorkflow = {
        id: '1',
        name: 'Test Workflow',
        active: false,
        nodes: [],
        connections: {}
      };

      const updatedWorkflow = {
        ...currentWorkflow,
        active: true
      };

      nock(API_BASE_URL)
        .post('/workflows/1/activate')
        .reply(404);

      nock(API_BASE_URL)
        .get('/workflows/1')
        .reply(200, { data: currentWorkflow });

      nock(API_BASE_URL)
        .put('/workflows/1')
        .reply(200, updatedWorkflow);

      const result = await activateWorkflow('1');

      expect(result).toEqual(updatedWorkflow);
    });
  });

  describe('deactivateWorkflow', () => {
    it('should deactivate workflow using specific endpoint', async () => {
      const mockResponse = {
        data: { id: '1', active: false }
      };

      nock(API_BASE_URL)
        .post('/workflows/1/deactivate')
        .reply(200, mockResponse);

      const result = await deactivateWorkflow('1');

      expect(result).toEqual(mockResponse);
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow', async () => {
      nock(API_BASE_URL)
        .delete('/workflows/1')
        .reply(200, { success: true, message: 'Workflow deleted' });

      const result = await deleteWorkflow('1');

      expect(result).toEqual({ success: true, message: 'Workflow deleted' });
    });

    it('should throw error for missing workflowId', async () => {
      await expect(deleteWorkflow()).rejects.toThrow('Workflow ID is required');
    });
  });
}); 