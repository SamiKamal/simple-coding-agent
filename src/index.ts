import { OpenAI } from 'openai';
import { taskPrompt } from './prompts';
import { toolsDefinitions, tools } from './tools';
import { ResponseInput } from 'openai/resources/responses/responses';
import 'dotenv/config';
import consola from 'consola';

async function main() {
    consola.box('Started session');
    const task = await consola.prompt('Enter a task', { type: 'text' });
    let messages: ResponseInput = [
        { role: 'user', content: taskPrompt(task) },
    ];

    consola.start('Cooking...');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        consola.error('Missing OPENAI_API_KEY in environment');
        throw new Error('Missing OPENAI_API_KEY in environment');
    }
    const openai = new OpenAI({ apiKey });

    while (true) {
        const completion = await openai.responses.create({
            model: 'gpt-5',
            input: messages,
            tools: toolsDefinitions
        });
        const content = completion.output[completion.output.length - 1];
        const type = content.type;
        if (type === 'function_call') {
            consola.info('Request to tool:', { name: content.name});

            messages.push(...completion.output);
            const toolResult = await tools[content.name](JSON.parse(content.arguments));
            messages.push({
                type: "function_call_output",
                call_id: content.call_id,
                output: JSON.stringify(toolResult),
            })
        }
        else if (type === 'message') {
            const outputContent = content.content[0];
            if (outputContent.type === 'output_text') {
                consola.log(outputContent.text);
            }

            const task = await consola.prompt('Enter a task', { type: 'text' });
            messages.push({
                role: 'user',
                content: taskPrompt(task),
            });
        }
    }

}

main();
