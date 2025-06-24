import nock from 'nock';
import { listCredentials, createCredential } from '../../services/credential-service.js';

const N8N_BASE_URL = 'http://localhost:5678';
const API_BASE_URL = `${N8N_BASE_URL}/api/v1`;

describe('Credential Service', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('listCredentials', () => {
    it('should return list of credentials', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            name: 'Test API Key',
            type: 'httpBasicAuth',
            createdAt: '2023-01-01T00:00:00.000Z',
            updatedAt: '2023-01-01T00:00:00.000Z'
          },
          {
            id: '2',
            name: 'Telegram Bot',
            type: 'telegramApi',
            createdAt: '2023-01-02T00:00:00.000Z',
            updatedAt: '2023-01-02T00:00:00.000Z'
          }
        ]
      };

      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 50 })
        .reply(200, mockResponse);

      const result = await listCredentials({ limit: 50 });

      expect(result).toEqual(mockResponse);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].type).toBe('httpBasicAuth');
      expect(result.data[1].type).toBe('telegramApi');
    });

    it('should handle different limit values', async () => {
      const mockResponse = {
        data: Array.from({ length: 25 }, (_, i) => ({
          id: `${i + 1}`,
          name: `Credential ${i + 1}`,
          type: 'httpBasicAuth',
          createdAt: '2023-01-01T00:00:00.000Z',
          updatedAt: '2023-01-01T00:00:00.000Z'
        }))
      };

      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 25 })
        .reply(200, mockResponse);

      const result = await listCredentials({ limit: 25 });

      expect(result.data).toHaveLength(25);
    });

    it('should use default limit when not specified', async () => {
      const mockResponse = {
        data: []
      };

      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 50 })
        .reply(200, mockResponse);

      const result = await listCredentials();

      expect(result).toEqual(mockResponse);
    });

    it('should handle credentials endpoint not available (405)', async () => {
      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 50 })
        .reply(405, { message: 'Method Not Allowed' });

      await expect(listCredentials({ limit: 50 })).rejects.toThrow();
    });

    it('should handle credentials endpoint not found (404)', async () => {
      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 50 })
        .reply(404, { message: 'Not Found' });

      await expect(listCredentials({ limit: 50 })).rejects.toThrow();
    });
  });

  describe('createCredential', () => {
    it('should create new credential', async () => {
      const credentialData = {
        name: 'New API Key',
        type: 'httpBasicAuth',
        data: {
          user: 'testuser',
          password: 'testpassword'
        }
      };

      const mockResponse = {
        data: {
          id: '3',
          name: 'New API Key',
          type: 'httpBasicAuth',
          createdAt: '2023-01-03T00:00:00.000Z',
          updatedAt: '2023-01-03T00:00:00.000Z'
        }
      };

      nock(API_BASE_URL)
        .post('/credentials', credentialData)
        .reply(201, mockResponse);

      const result = await createCredential(credentialData);

      expect(result).toEqual(mockResponse);
      expect(result.data.id).toBe('3');
      expect(result.data.name).toBe('New API Key');
      expect(result.data.type).toBe('httpBasicAuth');
    });

    it('should validate required fields', async () => {
      await expect(createCredential({})).rejects.toThrow('Name and type are required');
      await expect(createCredential({ name: 'Test' })).rejects.toThrow('Name and type are required');
      await expect(createCredential({ type: 'httpBasicAuth' })).rejects.toThrow('Name and type are required');
    });

    it('should handle API errors', async () => {
      const credentialData = {
        name: 'Test Credential',
        type: 'httpBasicAuth',
        data: {}
      };

      nock(API_BASE_URL)
        .post('/credentials')
        .reply(400, { message: 'Invalid credential data' });

      await expect(createCredential(credentialData)).rejects.toThrow();
    });

    it('should handle credentials endpoint not available', async () => {
      const credentialData = {
        name: 'Test Credential',
        type: 'httpBasicAuth',
        data: {}
      };

      nock(API_BASE_URL)
        .post('/credentials')
        .reply(405, { message: 'Method Not Allowed' });

      await expect(createCredential(credentialData)).rejects.toThrow();
    });
  });
}); 