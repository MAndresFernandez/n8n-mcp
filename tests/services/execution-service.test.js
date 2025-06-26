import nock from 'nock';
import { executeWorkflow, getExecution, listExecutions } from '../../services/execution-service.js';

const N8N_BASE_URL = 'http://localhost:5678';
const API_BASE_URL = `${N8N_BASE_URL}/api/v1`;

describe('Execution Service', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('listExecutions', () => {
    it('should successfully list executions', async () => {
      const mockResponse = {
        data: [
          { id: '1', workflowId: 'workflow1', status: 'success' },
          { id: '2', workflowId: 'workflow2', status: 'failed' }
        ]
      };

      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 10 })
        .reply(200, mockResponse);

      const result = await listExecutions({ limit: 10 });

      expect(result).toEqual(mockResponse);
    });

    it('should use default limit when not provided', async () => {
      const mockResponse = { data: [] };
      
      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 10 })
        .reply(200, mockResponse);

      const result = await listExecutions();

      expect(result).toEqual(mockResponse);
    });

    it('should handle API errors', async () => {
      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 10 })
        .reply(500, { message: 'Internal server error' });

      await expect(listExecutions({ limit: 10 })).rejects.toThrow('Request failed with status code 500');
    });

    it('should handle unauthorized access', async () => {
      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 10 })
        .reply(401, { message: 'Unauthorized' });

      await expect(listExecutions({ limit: 10 })).rejects.toThrow('Request failed with status code 401');
    });
  });

  describe('executeWorkflow', () => {
    it('should successfully execute a workflow', async () => {
      const mockResponse = {
        id: 'execution-123',
        workflowId: 'workflow-456',
        status: 'running'
      };

      nock(API_BASE_URL)
        .post('/rest/workflows/workflow-456/run', { input: 'test' })
        .reply(200, mockResponse);

      const result = await executeWorkflow('workflow-456', { input: 'test' });

      expect(result).toEqual(mockResponse);
    });

    it('should throw helpful error for 404 responses', async () => {
      nock(API_BASE_URL)
        .post('/rest/workflows/workflow-456/run', { input: 'test' })
        .reply(404, { message: 'Not found' });

      await expect(executeWorkflow('workflow-456', { input: 'test' }))
        .rejects
        .toThrow('Workflow not found or not accessible for execution via internal API');
    });

    it('should throw helpful error for 401 Unauthorized responses', async () => {
      nock(API_BASE_URL)
        .post('/rest/workflows/workflow-456/run', { input: 'test' })
        .reply(401, { message: 'Unauthorized' });

      await expect(executeWorkflow('workflow-456', { input: 'test' }))
        .rejects
        .toThrow('Unauthorized - The /rest/workflows/{id}/run endpoint is an internal API that requires different authentication than the public API');
    });

    it('should throw error when workflowId is not provided', async () => {
      await expect(executeWorkflow()).rejects.toThrow('workflowId is required');
    });

    it('should handle API errors', async () => {
      nock(API_BASE_URL)
        .post('/rest/workflows/workflow-456/run')
        .reply(500, { message: 'API Error' });

      await expect(executeWorkflow('workflow-456')).rejects.toThrow('Request failed with status code 500');
    });
  });

  describe('getExecution', () => {
    it('should successfully get execution details', async () => {
      const mockResponse = {
        id: 'execution-123',
        workflowId: 'workflow-456',
        status: 'success',
        data: { result: 'test output' }
      };

      nock(API_BASE_URL)
        .get('/executions/execution-123')
        .reply(200, mockResponse);

      const result = await getExecution('execution-123');

      expect(result).toEqual(mockResponse);
    });

    it('should throw error when executionId is not provided', async () => {
      await expect(getExecution()).rejects.toThrow('executionId is required');
    });

    it('should handle API errors', async () => {
      nock(API_BASE_URL)
        .get('/executions/execution-123')
        .reply(404, { message: 'Execution not found' });

      await expect(getExecution('execution-123')).rejects.toThrow('Request failed with status code 404');
    });
  });
}); 