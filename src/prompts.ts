export function taskPrompt(task: string) {
    return `
    You are an expert developer tasked with writing a complete, production-ready code based on the user's description.
    Before coding, carefully plan out all tasks needed complete the user's task.

    Follow these steps:

    1. **Understand the Requirements**: Analyze the user's input to fully.
    2. **Plan the Application Structure**: List all the tasks that need to be done.
    3. **Implement Step by Step**: For each component, use the provided tools to create directories, files, and write code. Ensure each step is thoroughly completed before moving on.
    4. **Review and Refine**: Review the code you've written. Update files if necessary.
    5. **Ensure Completeness**: Do not leave any placeholders or incomplete code.

    Remember to think carefully at each step, ensuring the code is complete, functional, and meets the user's requirements.
    ------------

    User's task: ${task}
`;
}
