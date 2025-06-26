import nock from 'nock';
import { executeWorkflow, getExecution, listExecutions } from '../../tools/execution-tools.js';

const N8N_BASE_URL = 'http://localhost:5678';
const API_BASE_URL = `${N8N_BASE_URL}/api/v1`;

describe('Execution Tools', () => {
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

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse.data);
      expect(result.count).toBe(2);
      expect(result.message).toBe('Retrieved 2 executions successfully');
    });

    it('should use default limit when not provided', async () => {
      const mockResponse = { data: [] };
      
      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 10 })
        .reply(200, mockResponse);

      await listExecutions();

      expect(nock.isDone()).toBe(true);
    });

    it('should handle API errors', async () => {
      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 10 })
        .reply(500, { message: 'Internal server error' });

      const result = await listExecutions({ limit: 10 });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Request failed with status code 500');
      expect(result.message).toBe('Failed to list executions');
      expect(result.statusCode).toBe(500);
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
        .post('/rest/workflows/workflow-456/run', { test: 'data' })
        .reply(200, mockResponse);

      const result = await executeWorkflow({ workflowId: 'workflow-456', inputData: { test: 'data' } });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(result.message).toBe('Workflow workflow-456 executed successfully via internal API endpoint');
      expect(result.executionId).toBe('execution-123');
    });

    it('should execute workflow with empty input data when not provided', async () => {
      const mockResponse = {
        id: 'execution-123',
        workflowId: 'workflow-456'
      };

      nock(API_BASE_URL)
        .post('/rest/workflows/workflow-456/run', {})
        .reply(200, mockResponse);

      const result = await executeWorkflow({ workflowId: 'workflow-456' });

      expect(result.success).toBe(true);
    });

    it('should handle missing workflowId', async () => {
      const result = await executeWorkflow({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('workflowId is required');
      expect(result.message).toBe('Failed to execute workflow undefined: workflowId is required');
    });

    it('should handle API errors', async () => {
      nock(API_BASE_URL)
        .post('/rest/workflows/workflow-456/run', {})
        .reply(404, { message: 'Workflow not found' });

      // Mock the fallback endpoint too
      nock(API_BASE_URL)
        .post('/executions', { workflowId: 'workflow-456', data: {} })
        .reply(404, { message: 'Workflow not found' });

      const result = await executeWorkflow({ workflowId: 'workflow-456' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Workflow not found');
      expect(result.message).toBe('Failed to execute workflow workflow-456: Workflow not found');
      expect(result.statusCode).toBe(404);
    });

    it('should handle network errors', async () => {
      nock(API_BASE_URL)
        .post('/rest/workflows/workflow-456/run', {})
        .replyWithError('Network error');

      // Mock the fallback endpoint too
      nock(API_BASE_URL)
        .post('/executions', { workflowId: 'workflow-456', data: {} })
        .replyWithError('Network error');

      const result = await executeWorkflow({ workflowId: 'workflow-456' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.statusCode).toBe('unknown');
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

      const result = await getExecution({ executionId: 'execution-123' });

      expect(result.success).toBe(true);
      expect(result.data).toEqual(mockResponse);
      expect(result.message).toBe('Execution execution-123 retrieved successfully');
    });

    it('should handle missing executionId', async () => {
      const result = await getExecution({});

      expect(result.success).toBe(false);
      expect(result.error).toBe('executionId is required');
      expect(result.message).toBe('Failed to get execution undefined: executionId is required');
    });

    it('should handle API errors', async () => {
      nock(API_BASE_URL)
        .get('/executions/execution-123')
        .reply(404, { message: 'Execution not found' });

      const result = await getExecution({ executionId: 'execution-123' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Execution not found');
      expect(result.message).toBe('Failed to get execution execution-123: Execution not found');
      expect(result.statusCode).toBe(404);
    });

    it('should handle network errors', async () => {
      nock(API_BASE_URL)
        .get('/executions/execution-123')
        .replyWithError('Network error');

      const result = await getExecution({ executionId: 'execution-123' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('Network error');
      expect(result.statusCode).toBe('unknown');
    });
  });
}); 