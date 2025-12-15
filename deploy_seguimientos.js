
import { createWorkflow } from './tools/workflow-tools.js';
import fs from 'fs';

// Set env vars explicitly from the user's config
process.env.N8N_BASE_URL = "https://n8n.cr-sites.com";
process.env.N8N_API_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJmNjljMTgwMS1kZmIwLTRkMTktYjk3Mi0zMTdhNjk5YWU2ZWMiLCJpc3MiOiJuOG4iLCJhdWQiOiJwdWJsaWMtYXBpIiwiaWF0IjoxNzY0ODEyNzY1fQ.xH7WbiBpiVeAnrib26qaw2PwAyMqdFzNBNTqPK7YJac";

async function main() {
    try {
        console.log('Reading workflow definition...');
        const workflowJson = JSON.parse(fs.readFileSync('./workflow_seguimientos_diarios.json', 'utf8'));

        console.log(`Deploying workflow: ${workflowJson.name}...`);

        // Extract args as expected by createWorkflow
        const args = {
            name: workflowJson.name,
            nodes: workflowJson.nodes,
            connections: workflowJson.connections,
            settings: workflowJson.settings || {}
        };

        const result = await createWorkflow(args);

        if (result.success) {
            console.log('✅ Workflow deployed successfully!');
            console.log(`ID: ${result.data.id}`);
            console.log(`Active: ${result.data.active}`);
            console.log(`Name: ${result.data.name}`);
        } else {
            console.error('❌ Failed to deploy workflow:', result.error);
        }

    } catch (error) {
        console.error('Unexpected error:', error);
    }
}

main();
