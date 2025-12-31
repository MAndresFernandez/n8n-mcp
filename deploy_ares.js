import { createWorkflow, listWorkflows, updateWorkflow } from './tools/workflow-tools.js';

const ARES_CHAT_HANDLER = {
    name: "ARES Protocol: Main Chat Handler",
    nodes: [
        {
            parameters: {
                httpMethod: "POST",
                path: "ares-webhook",
                options: {}
            },
            id: "webhook-trigger",
            name: "Evolution Webhook",
            type: "n8n-nodes-base.webhook",
            typeVersion: 2,
            position: [250, 300]
        },
        {
            parameters: {
                conditions: {
                    boolean: [
                        {
                            value1: "={{ $json.body.fromMe }}",
                            value2: true
                        }
                    ]
                }
            },
            id: "filter-from-me",
            name: "Filter Outgoing",
            type: "n8n-nodes-base.filter",
            typeVersion: 2,
            position: [470, 300]
        },
        {
            parameters: {
                promptType: "define",
                text: "={{ $json.body.message?.conversation || $json.body.message?.extendedTextMessage?.text }}",
                options: {
                    systemMessage: "Eres ARES, un sistema de Neuro-Arquitectura diseñado para recuperar la soberanía dopaminérgica del usuario.\nNO eres un asistente virtual servicial y pasivo. Eres un estratega, un mentor estoico y un neurocientífico.\n\n**TU BASE DE CONOCIMIENTO:**\n1. Neurobiología: Sabes que la adicción al porno es causada por DeltaFosB. Explica los impulsos como hambre de dopamina.\n2. Economía: Recuérdale el costo de oportunidad.\n3. Estoicismo: Usa la Dicotomía del Control.\n\n**MODOS:**\n- Default: Socrático y lógico.\n- URGENCIA (si detectas SOS/URGENCIA): Directivo, ordena ejercicio o respiración.\n- Check-in: Analiza tendencias.\n\nSé conciso (WhatsApp). No uses clichés. Disciplina es libertad."
                }
            },
            id: "ai-agent",
            name: "ARES Agent",
            type: "@n8n/n8n-nodes-langchain.agent",
            typeVersion: 1.6,
            position: [700, 300]
        },
        {
            parameters: {
                model: "gpt-4o",
                options: {}
            },
            id: "chat-model",
            name: "OpenAI Chat Model",
            type: "@n8n/n8n-nodes-langchain.lmChatOpenAi",
            typeVersion: 1,
            position: [620, 500]
        },
        {
            parameters: {
                tableName: "chat_history",
                sessionIdKey: "={{ $json.body.key.remoteJid }}",
                postgresOptions: {
                    user: "postgres",
                    host: "db.qvxxhwcspqntdesrajph.supabase.co",
                    database: "postgres",
                    port: 5432
                }
            },
            id: "chat-memory",
            name: "Postgres Chat Memory",
            type: "@n8n/n8n-nodes-langchain.memoryPostgresChat",
            typeVersion: 1,
            position: [750, 500]
        }
    ],
    connections: {
        "webhook-trigger": {
            main: [
                [
                    {
                        node: "filter-from-me",
                        type: "main",
                        index: 0
                    }
                ]
            ]
        },
        "filter-from-me": {
            main: [
                [
                    {
                        node: "ai-agent",
                        type: "main",
                        index: 0
                    }
                ]
            ]
        },
        "chat-model": {
            ai_languageModel: [
                [
                    {
                        node: "ai-agent",
                        type: "ai_languageModel",
                        index: 0
                    }
                ]
            ]
        },
        "chat-memory": {
            ai_memory: [
                [
                    {
                        node: "ai-agent",
                        type: "ai_memory",
                        index: 0
                    }
                ]
            ]
        }
    }
};

const ARES_CRON_JOBS = {
    name: "ARES Protocol: Cron Jobs",
    nodes: [
        {
            parameters: {
                triggerTimes: {
                    item: [
                        { hour: 8 },
                        { hour: 21 }
                    ]
                }
            },
            id: "cron-trigger",
            name: "Morning & Night Trigger",
            type: "n8n-nodes-base.cron",
            typeVersion: 1,
            position: [250, 300]
        },
        {
            parameters: {
                operation: "select",
                schema: "public",
                table: "users",
                returnAll: true
            },
            id: "get-users",
            name: "Get Active Users",
            type: "n8n-nodes-base.supabase",
            typeVersion: 1,
            position: [450, 300]
        }
    ],
    connections: {
        "cron-trigger": {
            main: [[{ node: "get-users", type: "main", index: 0 }]]
        }
    }
};

async function deployWorkflow(workflow) {
    console.log(`Checking existing workflow: ${workflow.name}`);
    const list = await listWorkflows();
    const existing = list.data.find(w => w.name === workflow.name);

    if (existing) {
        console.log(`Updating ${workflow.name}...`);
        return await updateWorkflow({ workflowId: existing.id, ...workflow });
    } else {
        console.log(`Creating ${workflow.name}...`);
        return await createWorkflow(workflow);
    }
}

async function deploy() {
    try {
        const resA = await deployWorkflow(ARES_CHAT_HANDLER);
        console.log('ARES Chat Handler:', resA.success ? 'OK' : resA.error);

        const resB = await deployWorkflow(ARES_CRON_JOBS);
        console.log('ARES Cron Jobs:', resB.success ? 'OK' : resB.error);

    } catch (e) {
        console.error('Deployment failed:', e.message);
    }
}

deploy();
