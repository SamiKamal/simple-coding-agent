import { OpenAI } from 'openai';
import { input } from '@inquirer/prompts';
import { taskPrompt } from './prompts';
import { startSpinner } from './spinner';
import { toolsDefinitions, tools } from './tools';
import { ResponseInput } from 'openai/resources/responses/responses';
import 'dotenv/config';

async function main() {
    const task = await input({ message: 'Enter a task' });
    let messages: ResponseInput = [
        { role: 'user', content: taskPrompt(task) },
    ];

    const stopSpinner = startSpinner('Working…');

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
        throw new Error('Missing OPENAI_API_KEY in environment');
    }
    const openai = new OpenAI({ apiKey });

    while (true) {
        const completion = await openai.responses.create({
            model: 'gpt-5-mini',
            input: messages,
            tools: toolsDefinitions
        });
        const content = completion.output[completion.output.length - 1];
        const type = content.type;
        if (type === 'function_call') {
            messages = completion.output;
            const toolResult = await tools[content.name](JSON.parse(content.arguments));
            messages.push({
                type: "function_call_output",
                call_id: content.call_id,
                output: JSON.stringify(toolResult),
            })
        }
        else if (type === 'message') {
            stopSpinner();
            break;
        }
    }

}

main();
