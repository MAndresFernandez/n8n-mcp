import nock from 'nock';
import { listExecutions } from '../../services/execution-service.js';

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
    it('should return list of executions', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            workflowId: 'workflow-1',
            mode: 'manual',
            status: 'success',
            startedAt: '2023-01-01T10:00:00.000Z',
            stoppedAt: '2023-01-01T10:01:00.000Z',
            finished: true
          },
          {
            id: '2',
            workflowId: 'workflow-2',
            mode: 'trigger',
            status: 'running',
            startedAt: '2023-01-01T11:00:00.000Z',
            stoppedAt: null,
            finished: false
          }
        ]
      };

      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 10 })
        .reply(200, mockResponse);

      const result = await listExecutions({ limit: 10 });

      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].status).toBe('success');
      expect(result.data[1].status).toBe('running');
    });

    it('should handle different limit values', async () => {
      const mockResponse = {
        data: Array.from({ length: 25 }, (_, i) => ({
          id: `${i + 1}`,
          workflowId: `workflow-${i + 1}`,
          mode: 'manual',
          status: 'success',
          startedAt: '2023-01-01T10:00:00.000Z',
          stoppedAt: '2023-01-01T10:01:00.000Z',
          finished: true
        }))
      };

      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 25 })
        .reply(200, mockResponse);

      const result = await listExecutions({ limit: 25 });

      expect(result.data).toHaveLength(25);
    });

    it('should use default limit when not specified', async () => {
      const mockResponse = {
        data: []
      };

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

      await expect(listExecutions({ limit: 10 })).rejects.toThrow();
    });

    it('should handle unauthorized access', async () => {
      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 10 })
        .reply(401, { message: 'Unauthorized' });

      await expect(listExecutions({ limit: 10 })).rejects.toThrow();
    });
  });
}); 