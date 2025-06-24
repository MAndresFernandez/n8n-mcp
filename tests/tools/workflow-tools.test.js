import nock from 'nock';
import {
  activateWorkflow,
  deactivateWorkflow,
  listWorkflows,
  getWorkflow,
  createWorkflow,
  updateWorkflow,
  deleteWorkflow
} from '../../tools/workflow-tools.js';

const N8N_BASE_URL = 'http://localhost:5678';
const API_BASE_URL = `${N8N_BASE_URL}/api/v1`;

describe('Workflow Tools', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('activateWorkflow', () => {
    it('should activate workflow using specific endpoint', async () => {
      const mockServiceResponse = { id: '1', active: true };
      const mockResponse = {
        data: mockServiceResponse
      };

      nock(API_BASE_URL)
        .post('/workflows/1/activate')
        .reply(200, mockResponse);

      const result = await activateWorkflow({ workflowId: '1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockServiceResponse);
      expect(result.message).toBe('Workflow 1 activated successfully');
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

      const result = await activateWorkflow({ workflowId: '1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedWorkflow);
      expect(result.message).toBe('Workflow 1 activated successfully');
    });

    it('should handle authentication errors', async () => {
      nock(API_BASE_URL)
        .post('/workflows/1/activate')
        .reply(401, { message: 'Unauthorized' });

      const result = await activateWorkflow({ workflowId: '1' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Unauthorized');
      expect(result.message).toBe('Failed to activate workflow 1: Unauthorized');
    });

    it('should handle workflow not found errors', async () => {
      nock(API_BASE_URL)
        .post('/workflows/999/activate')
        .reply(404, { message: 'Workflow not found' });

      nock(API_BASE_URL)
        .get('/workflows/999')
        .reply(404, { message: 'Workflow not found' });

      const result = await activateWorkflow({ workflowId: '999' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to activate workflow 999: Workflow not found');
    });

    it('should handle missing workflowId', async () => {
      nock(API_BASE_URL)
        .post('/workflows/undefined/activate')
        .reply(400, { message: 'Bad Request' });

      const result = await activateWorkflow({});

      expect(result.success).toBe(false);
      expect(result.message).toBe('Failed to activate workflow undefined: workflowId is required');
    });
  });

  describe('deactivateWorkflow', () => {
    it('should deactivate workflow using specific endpoint', async () => {
      const mockServiceResponse = { id: '1', active: false };
      const mockResponse = {
        data: mockServiceResponse
      };

      nock(API_BASE_URL)
        .post('/workflows/1/deactivate')
        .reply(200, mockResponse);

      const result = await deactivateWorkflow({ workflowId: '1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockServiceResponse);
      expect(result.message).toBe('Workflow 1 deactivated successfully');
    });

    it('should fallback to update method if deactivate endpoint not found', async () => {
      const currentWorkflow = {
        id: '1',
        name: 'Test Workflow',
        active: true,
        nodes: [],
        connections: {}
      };

      const updatedWorkflow = {
        ...currentWorkflow,
        active: false
      };

      nock(API_BASE_URL)
        .post('/workflows/1/deactivate')
        .reply(404);

      nock(API_BASE_URL)
        .get('/workflows/1')
        .reply(200, { data: currentWorkflow });

      nock(API_BASE_URL)
        .put('/workflows/1')
        .reply(200, updatedWorkflow);

      const result = await deactivateWorkflow({ workflowId: '1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedWorkflow);
      expect(result.message).toBe('Workflow 1 deactivated successfully');
    });

    it('should handle server errors', async () => {
      nock(API_BASE_URL)
        .post('/workflows/1/deactivate')
        .reply(500, { message: 'Internal server error' });

      const result = await deactivateWorkflow({ workflowId: '1' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Request failed with status code 500');
      expect(result.message).toBe('Failed to deactivate workflow 1');
    });

    it('should handle network errors', async () => {
      nock(API_BASE_URL)
        .post('/workflows/1/deactivate')
        .replyWithError('Network error');

      const result = await deactivateWorkflow({ workflowId: '1' });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Network error');
      expect(result.message).toBe('Failed to deactivate workflow 1');
    });
  });

  describe('listWorkflows', () => {
    it('should list workflows successfully', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            name: 'Test Workflow 1',
            active: true
          },
          {
            id: '2',
            name: 'Test Workflow 2',
            active: false
          }
        ]
      };

      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 50 })
        .reply(200, mockResponse);

      const result = await listWorkflows();

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
      expect(result.count).toBe(2);
      expect(result.message).toBe('Retrieved 2 workflows successfully');
    });
  });

  describe('getWorkflow', () => {
    it('should get workflow successfully', async () => {
      const mockWorkflow = {
        id: '1',
        name: 'Test Workflow',
        active: true,
        nodes: []
      };

      nock(API_BASE_URL)
        .get('/workflows/1')
        .reply(200, mockWorkflow);

      const result = await getWorkflow({ workflowId: '1' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockWorkflow);
      expect(result.message).toBe('Workflow 1 retrieved successfully');
    });
  });

  describe('createWorkflow', () => {
    it('should create workflow successfully', async () => {
      const workflowData = {
        name: 'New Workflow',
        nodes: [
          {
            id: 'trigger',
            name: 'Manual Trigger',
            type: 'n8n-nodes-base.manualTrigger',
            position: [240, 300]
          }
        ]
      };

      const mockResponse = {
        id: '3',
        ...workflowData,
        active: false
      };

      nock(API_BASE_URL)
        .post('/workflows')
        .reply(201, mockResponse);

      const result = await createWorkflow(workflowData);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(result.message).toBe('Workflow "New Workflow" created successfully with ID: 3');
    });
  });

  describe('updateWorkflow', () => {
    it('should update workflow successfully', async () => {
      const currentWorkflow = {
        id: '1',
        name: 'Original Name',
        active: false,
        nodes: []
      };

      const updatedWorkflow = {
        ...currentWorkflow,
        name: 'Updated Name'
      };

      nock(API_BASE_URL)
        .get('/workflows/1')
        .reply(200, currentWorkflow);

      nock(API_BASE_URL)
        .put('/workflows/1')
        .reply(200, updatedWorkflow);

      const result = await updateWorkflow({
        workflowId: '1',
        name: 'Updated Name'
      });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(updatedWorkflow);
      expect(result.message).toBe('Workflow "Updated Name" (1) updated successfully');
    });
  });

  describe('deleteWorkflow', () => {
    it('should delete workflow successfully', async () => {
      nock(API_BASE_URL)
        .delete('/workflows/1')
        .reply(200, { success: true });

      const result = await deleteWorkflow('1');

      expect(result.success).toBe(true);
      expect(result.workflowId).toBe('1');
      expect(result.message).toBe('Workflow 1 deleted successfully');
    });
  });

  describe('Integration Tests', () => {
    it('should handle complete workflow lifecycle', async () => {
      // Create workflow
      const workflowData = {
        name: 'Lifecycle Test Workflow',
        nodes: [
          {
            id: 'trigger',
            name: 'Manual Trigger',
            type: 'n8n-nodes-base.manualTrigger',
            position: [240, 300]
          }
        ]
      };

      const createdWorkflow = {
        id: '123',
        ...workflowData,
        active: false
      };

      nock(API_BASE_URL)
        .post('/workflows')
        .reply(201, createdWorkflow);

      const createResult = await createWorkflow(workflowData);
      expect(createResult.success).toBe(true);

      // Activate workflow
      nock(API_BASE_URL)
        .post('/workflows/123/activate')
        .reply(200, { data: { id: '123', active: true } });

      const activateResult = await activateWorkflow({ workflowId: '123' });
      expect(activateResult.success).toBe(true);

      // Deactivate workflow
      nock(API_BASE_URL)
        .post('/workflows/123/deactivate')
        .reply(200, { data: { id: '123', active: false } });

      const deactivateResult = await deactivateWorkflow({ workflowId: '123' });
      expect(deactivateResult.success).toBe(true);

      // Delete workflow
      nock(API_BASE_URL)
        .delete('/workflows/123')
        .reply(200, { success: true });

      const deleteResult = await deleteWorkflow('123');
      expect(deleteResult.success).toBe(true);
    });
  });
}); 