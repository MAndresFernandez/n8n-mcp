 import nock from 'nock';
import { listNodeTypes } from '../../services/node-service.js';

const N8N_BASE_URL = 'http://localhost:5678';

describe('Node Service', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('listNodeTypes', () => {
    it('should return list of node types', async () => {
      const mockResponse = [
        {
          name: 'n8n-nodes-base.manualTrigger',
          displayName: 'Manual Trigger',
          description: 'Manually triggers a workflow',
          version: 1,
          group: ['trigger'],
          usableAsTool: false
        },
        {
          name: 'n8n-nodes-base.httpRequest',
          displayName: 'HTTP Request',
          description: 'Makes an HTTP request',
          version: 3,
          group: ['regular'],
          usableAsTool: true
        },
        {
          name: 'n8n-nodes-base.set',
          displayName: 'Set',
          description: 'Set values in a workflow',
          version: 2,
          group: ['regular'],
          usableAsTool: false
        }
      ];

      nock(N8N_BASE_URL)
        .get('/types/nodes.json')
        .reply(200, mockResponse);

      const result = await listNodeTypes();

      expect(result).toEqual(mockResponse);
      expect(result).toHaveLength(3);
      expect(result[0].name).toBe('n8n-nodes-base.manualTrigger');
      expect(result[1].name).toBe('n8n-nodes-base.httpRequest');
      expect(result[2].name).toBe('n8n-nodes-base.set');
    });

    it('should handle empty node list', async () => {
      const mockResponse = [];

      nock(N8N_BASE_URL)
        .get('/types/nodes.json')
        .reply(200, mockResponse);

      const result = await listNodeTypes();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('should handle API errors', async () => {
      nock(N8N_BASE_URL)
        .get('/types/nodes.json')
        .reply(500, { message: 'Internal server error' });

      await expect(listNodeTypes()).rejects.toThrow();
    });

    it('should handle unauthorized access', async () => {
      nock(N8N_BASE_URL)
        .get('/types/nodes.json')
        .reply(401, { message: 'Unauthorized' });

      await expect(listNodeTypes()).rejects.toThrow();
    });
  });
}); 