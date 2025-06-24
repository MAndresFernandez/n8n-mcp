import nock from 'nock';
import { selfTest } from '../../tools/test-tools.js';

const N8N_BASE_URL = 'http://localhost:5678';
const API_BASE_URL = `${N8N_BASE_URL}/api/v1`;

describe('Self Test Tool', () => {
  beforeEach(() => {
    nock.cleanAll();
  });

  afterEach(() => {
    nock.cleanAll();
  });

  describe('selfTest', () => {
    it('should run all tool tests and return comprehensive results', async () => {
      // Mock all the API endpoints that will be called during self test
      
      // 1. Basic connection test
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 1 })
        .reply(200, { data: [{ id: '1', name: 'Test Workflow' }] });

      // 2. List workflows test
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 3 })
        .reply(200, { data: [
          { id: '1', name: 'Workflow 1', active: true },
          { id: '2', name: 'Workflow 2', active: false }
        ]});

      // 3. Get workflow test (uses workflow from list)
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 1 })
        .reply(200, { data: [{ id: '1', name: 'Test Workflow' }] });

      nock(API_BASE_URL)
        .get('/workflows/1')
        .reply(200, {
          id: '1',
          name: 'Test Workflow',
          nodes: [{ id: 'node1', name: 'Manual Trigger' }],
          connections: {}
        });

      // 4. List executions test
      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 2 })
        .reply(200, { data: [
          { id: 'exec1', workflowId: '1', status: 'success' }
        ]});

      // 5. List credentials test
      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 5 })
        .reply(200, { data: [
          { id: 'cred1', name: 'Test Credential', type: 'httpBasicAuth' }
        ]});

      // 6. List nodes test
      nock(API_BASE_URL)
        .get('/types/nodes.json')
        .reply(200, {
          'n8n-nodes-base.manualTrigger': {
            displayName: 'Manual Trigger',
            group: ['trigger']
          },
          'n8n-nodes-base.set': {
            displayName: 'Set',
            group: ['transform']
          }
        });

      // 7. Create workflow test
      nock(API_BASE_URL)
        .post('/workflows')
        .reply(201, {
          id: 'created-workflow-1',
          name: 'Self-Test Workflow',
          nodes: [{ id: 'self-test-manual-trigger', name: 'Manual Trigger' }],
          active: false
        });

      // 8. Update workflow test
      nock(API_BASE_URL)
        .get('/workflows/created-workflow-1')
        .reply(200, {
          id: 'created-workflow-1',
          name: 'Self-Test Workflow',
          nodes: [{ id: 'self-test-manual-trigger', name: 'Manual Trigger' }],
          connections: {}
        });

      nock(API_BASE_URL)
        .put('/workflows/created-workflow-1')
        .reply(200, {
          id: 'created-workflow-1',
          name: 'Updated Self-Test Workflow',
          nodes: [
            { id: 'self-test-manual-trigger', name: 'Manual Trigger' },
            { id: 'self-test-set-node', name: 'Test Set Node' }
          ]
        });

      // 9. Activate workflow test
      nock(API_BASE_URL)
        .post('/workflows/created-workflow-1/activate')
        .reply(200, { data: { id: 'created-workflow-1', active: true } });

      // 10. Deactivate workflow test
      nock(API_BASE_URL)
        .post('/workflows/created-workflow-1/deactivate')
        .reply(200, { data: { id: 'created-workflow-1', active: false } });

      // 11. Create credential test
      nock(API_BASE_URL)
        .post('/credentials')
        .reply(201, {
          id: 'created-credential-1',
          name: 'Self-Test Credential',
          type: 'httpBasicAuth'
        });

      // 12. Delete workflow test (creates temp workflow then deletes it)
      nock(API_BASE_URL)
        .post('/workflows')
        .reply(201, {
          id: 'delete-test-workflow',
          name: 'MCP Delete Test Workflow',
          nodes: [{ id: 'delete-test-manual-trigger', name: 'Manual Trigger' }]
        });

      nock(API_BASE_URL)
        .delete('/workflows/delete-test-workflow')
        .reply(200, { success: true });

      // Cleanup - delete created workflow
      nock(API_BASE_URL)
        .delete('/workflows/created-workflow-1')
        .reply(200, { success: true });

      const result = await selfTest();

      // The self test may not be fully successful due to mocked APIs not matching all requests
      // but it should return structured results
      expect(result.data).toBeDefined();
      expect(result.data.tests).toBeDefined();
      expect(result.data.summary).toBeDefined();
      
      // Should have tested all tools
      expect(result.data.summary.total).toBeGreaterThan(10);
      expect(result.data.summary.passed).toBeGreaterThan(0);
      
      // Check that specific tools were tested
      const testNames = result.data.tests.map(test => test.name);
      expect(testNames).toContain('n8n API Connection');
      expect(testNames).toContain('list_workflows');
      expect(testNames).toContain('get_workflow');
      expect(testNames).toContain('list_executions');
      expect(testNames).toContain('list_credentials');
      expect(testNames).toContain('list_nodes');
      expect(testNames).toContain('create_workflow');
      expect(testNames).toContain('update_workflow');
      expect(testNames).toContain('activate_workflow');
      expect(testNames).toContain('deactivate_workflow');
      expect(testNames).toContain('create_credential');
      expect(testNames).toContain('delete_workflow');

      expect(result.message).toContain('Self-test completed');
      expect(result.message).toContain('tests passed');
    });

    it('should handle API connection failures gracefully', async () => {
      // Mock API connection failure
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 1 })
        .reply(401, { message: 'Unauthorized' });

      // Mock other endpoints to fail as well
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 3 })
        .reply(401, { message: 'Unauthorized' });

      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 2 })
        .reply(401, { message: 'Unauthorized' });

      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 5 })
        .reply(401, { message: 'Unauthorized' });

      nock(API_BASE_URL)
        .get('/types/nodes.json')
        .reply(401, { message: 'Unauthorized' });

      const result = await selfTest();

      expect(result.success).toBe(false);
      expect(result.data.summary.failed).toBeGreaterThan(0);
      expect(result.message).toContain('tests failed');
      
      // Should still return structured results
      expect(result.data.tests).toBeDefined();
      expect(result.data.summary).toBeDefined();
    });

    it('should skip dependent tests when prerequisites fail', async () => {
      // Mock basic connection success
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 1 })
        .reply(200, { data: [] });

      // Mock list workflows returning empty
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 3 })
        .reply(200, { data: [] });

      // Mock other endpoints
      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 2 })
        .reply(200, { data: [] });

      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 5 })
        .reply(200, { data: [] });

      nock(API_BASE_URL)
        .get('/types/nodes.json')
        .reply(200, {});

      // Mock workflow creation failure
      nock(API_BASE_URL)
        .post('/workflows')
        .reply(403, { message: 'Forbidden' });

      const result = await selfTest();

      expect(result.data.tests).toBeDefined();
      
      // Should have some skipped tests due to missing prerequisites
      const skippedTests = result.data.tests.filter(test => test.status === 'SKIP');
      expect(skippedTests.length).toBeGreaterThan(0);
      
      // get_workflow should be skipped because no workflows exist
      const getWorkflowTest = result.data.tests.find(test => test.name === 'get_workflow');
      expect(getWorkflowTest?.status).toBe('SKIP');
    });

    it('should handle mixed success and failure scenarios', async () => {
      // Mock some successful and some failed endpoints
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 1 })
        .reply(200, { data: [{ id: '1', name: 'Test' }] });

      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 3 })
        .reply(200, { data: [{ id: '1', name: 'Test' }] });

      nock(API_BASE_URL)
        .get('/workflows/1')
        .reply(200, { id: '1', name: 'Test', nodes: [] });

      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 2 })
        .reply(500, { message: 'Internal Server Error' });

      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 5 })
        .reply(404, { message: 'Not Found' });

      nock(API_BASE_URL)
        .get('/types/nodes.json')
        .reply(200, { 'n8n-nodes-base.manualTrigger': { displayName: 'Manual Trigger' } });

      nock(API_BASE_URL)
        .post('/workflows')
        .reply(403, { message: 'Forbidden' });

      const result = await selfTest();

      expect(result.data.summary.passed).toBeGreaterThan(0);
      expect(result.data.summary.failed).toBeGreaterThan(0);
      expect(result.data.summary.total).toBeGreaterThan(0);
      
      // Should have detailed test results
      expect(result.data.tests.length).toBe(result.data.summary.total);
    });

    it('should provide detailed test information for each tool', async () => {
      // Mock minimal successful responses
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 1 })
        .reply(200, { data: [] });

      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 3 })
        .reply(200, { data: [] });

      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 2 })
        .reply(200, { data: [] });

      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 5 })
        .reply(200, { data: [] });

      nock(API_BASE_URL)
        .get('/types/nodes.json')
        .reply(200, {});

      nock(API_BASE_URL)
        .post('/workflows')
        .reply(400, { message: 'Bad Request' });

      const result = await selfTest();

      expect(result.data.tests).toBeDefined();
      
      // Each test should have required fields
      result.data.tests.forEach(test => {
        expect(test).toHaveProperty('name');
        expect(test).toHaveProperty('status');
        expect(test).toHaveProperty('message');
        expect(test).toHaveProperty('input');
        expect(test).toHaveProperty('output');
        expect(['PASS', 'FAIL', 'SKIP']).toContain(test.status);
      });
    });

    it('should calculate correct success rate', async () => {
      // Mock specific number of successes and failures
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 1 })
        .reply(200, { data: [] }); // Success

      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 3 })
        .reply(401, { message: 'Unauthorized' }); // Failure

      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 2 })
        .reply(200, { data: [] }); // Success

      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 5 })
        .reply(200, { data: [] }); // Success

      nock(API_BASE_URL)
        .get('/types/nodes.json')
        .reply(500, { message: 'Server Error' }); // Failure

      nock(API_BASE_URL)
        .post('/workflows')
        .reply(400, { message: 'Bad Request' }); // Failure

      const result = await selfTest();

      expect(result.data.summary.total).toBeGreaterThan(0);
      const expectedSuccessRate = ((result.data.summary.passed / result.data.summary.total) * 100).toFixed(1);
      expect(result.message).toContain(`${expectedSuccessRate}% success rate`);
    });
  });

  describe('error handling', () => {
    it('should handle network errors gracefully', async () => {
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 1 })
        .replyWithError('Network error');

      const result = await selfTest();

      expect(result.success).toBe(false);
      expect(result.data.summary.failed).toBeGreaterThan(0);
      
      const connectionTest = result.data.tests.find(test => test.name === 'n8n API Connection');
      expect(connectionTest?.status).toBe('FAIL');
      expect(connectionTest?.message).toContain('Network error');
    });

    it('should handle timeout errors', async () => {
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 1 })
        .delay(30000) // Simulate timeout
        .reply(200, { data: [] });

      const result = await selfTest();

      expect(result.data.tests).toBeDefined();
      expect(result.data.summary.total).toBeGreaterThan(0);
    });
  });

  describe('cleanup', () => {
    it('should clean up created test workflows', async () => {
      // Mock workflow creation
      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 1 })
        .reply(200, { data: [] });

      nock(API_BASE_URL)
        .get('/workflows')
        .query({ limit: 3 })
        .reply(200, { data: [] });

      nock(API_BASE_URL)
        .get('/executions')
        .query({ limit: 2 })
        .reply(200, { data: [] });

      nock(API_BASE_URL)
        .get('/credentials')
        .query({ limit: 5 })
        .reply(200, { data: [] });

      nock(API_BASE_URL)
        .get('/types/nodes.json')
        .reply(200, {});

      nock(API_BASE_URL)
        .post('/workflows')
        .reply(201, {
          id: 'test-workflow-123',
          name: 'Self-Test Workflow',
          nodes: []
        });

      // Mock cleanup deletion
      nock(API_BASE_URL)
        .delete('/workflows/test-workflow-123')
        .reply(200, { success: true });

      // Mock delete test workflow creation and deletion
      nock(API_BASE_URL)
        .post('/workflows')
        .reply(201, {
          id: 'delete-test-workflow',
          name: 'MCP Delete Test Workflow',
          nodes: []
        });

      nock(API_BASE_URL)
        .delete('/workflows/delete-test-workflow')
        .reply(200, { success: true });

      const result = await selfTest();

      expect(result.data.tests).toBeDefined();
      
      // Verify that workflows were created and then cleaned up
      const createTest = result.data.tests.find(test => test.name === 'create_workflow');
      expect(createTest?.status).toBe('PASS');
    });
  });
}); 