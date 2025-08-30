import OpenAI from "openai";
import { promises as fs } from "fs";
import path from "path";

export const toolsDefinitions: OpenAI.Responses.Tool[] = [
    {
        type: "function",
        name: "read_file",
        description: "Read a file from disk.",
        parameters: {
            type: "object",
            properties: {
                file_path: {
                    type: "string",
                    description: "Path to the file to read.",
                },
            },
            required: ["file_path"],
            additionalProperties: false,
        },
        strict: true,
    },
    {
        type: "function",
        name: "list_dir",
        description: "List files and folders within a directory.",
        parameters: {
            type: "object",
            properties: {
                dir_path: {
                    type: "string",
                    description: "Path to the directory. Defaults to CWD if omitted.",
                },
                recursive: {
                    type: "boolean",
                    description: "If true, list recursively.",
                },
            },
            required: ['dir_path', 'recursive'],
            additionalProperties: false,
        },
        strict: true,
    },
    {
        type: "function",
        name: "edit_file",
        description: "Edit or create a file. Supports modes: overwrite, append, replace.",
        parameters: {
            type: "object",
            properties: {
                file_path: {
                    type: "string",
                    description: "Absolute or relative path to the file to edit.",
                },
                mode: {
                    type: "string",
                    enum: ["overwrite", "append", "replace"],
                    description: "Edit mode: overwrite writes content, append appends content, replace finds and replaces text.",
                },
                content: {
                    type: "string",
                    description: "Content to write or append (required for overwrite/append).",
                },
                find: {
                    type: "string",
                    description: "Text to find (required for replace mode).",
                },
                replace: {
                    type: "string",
                    description: "Replacement text (required for replace mode).",
                },
                ensure_dir: {
                    type: "boolean",
                    description: "If true, create parent directories if they don't exist.",
                },
            },
            required: ["file_path", "mode", "content", "find", "replace", "ensure_dir"],
            additionalProperties: false,
        },
        strict: true,
    },
];

export type ToolFunction = (args: Record<string, unknown>) => Promise<unknown>;

export const tools: Record<string, ToolFunction> = {
    read_file: async (args: Record<string, unknown>) => {
        const file_path = args?.["file_path"];
        if (typeof file_path !== "string" || file_path.length === 0) {
            throw new Error("file_path must be a non-empty string");
        }

        const resolvedPath = path.isAbsolute(file_path)
            ? file_path
            : path.resolve(process.cwd(), file_path);
        const content = await fs.readFile(resolvedPath, "utf8");

        return {
            file_path: resolvedPath,
            content,
        };
    },
    list_dir: async (args: Record<string, unknown>) => {
        const dir_path = typeof args?.["dir_path"] === "string" && (args?.["dir_path"] as string).length > 0
            ? (args?.["dir_path"] as string)
            : process.cwd();
        const recursive = args?.["recursive"] === true;

        const startPath = path.isAbsolute(dir_path) ? dir_path : path.resolve(process.cwd(), dir_path);

        if (!recursive) {
            const entries = await fs.readdir(startPath, { withFileTypes: true });
            return entries.map(e => ({
                name: e.name,
                path: path.join(startPath, e.name),
                type: e.isDirectory() ? "directory" : "file",
            }));
        }

        const result: Array<{ name: string; path: string; type: "file" | "directory"; }> = [];
        const stack: string[] = [startPath];
        while (stack.length > 0) {
            const current = stack.pop() as string;
            const entries = await fs.readdir(current, { withFileTypes: true });
            for (const e of entries) {
                const full = path.join(current, e.name);
                const type = e.isDirectory() ? "directory" : "file";
                result.push({ name: e.name, path: full, type });
                if (e.isDirectory()) stack.push(full);
            }
        }
        return result;
    },
    edit_file: async (args: Record<string, unknown>) => {
        const file_path = args?.["file_path"];
        const mode = args?.["mode"];
        const contentArg = args?.["content"];
        const findArg = args?.["find"];
        const replaceArg = args?.["replace"];
        const ensureDir = args?.["ensure_dir"] === true;

        if (typeof file_path !== "string" || file_path.length === 0) {
            throw new Error("file_path must be a non-empty string");
        }
        if (mode !== "overwrite" && mode !== "append" && mode !== "replace") {
            throw new Error("mode must be one of: overwrite, append, replace");
        }

        const resolvedPath = path.isAbsolute(file_path)
            ? file_path
            : path.resolve(process.cwd(), file_path);

        if (ensureDir) {
            const dir = path.dirname(resolvedPath);
            await fs.mkdir(dir, { recursive: true });
        }

        if (mode === "overwrite") {
            if (typeof contentArg !== "string") {
                throw new Error("content must be a string for overwrite mode");
            }
            await fs.writeFile(resolvedPath, contentArg, "utf8");
            const stats = await fs.stat(resolvedPath);
            return { file_path: resolvedPath, bytes: stats.size, action: "overwritten" };
        }

        if (mode === "append") {
            if (typeof contentArg !== "string") {
                throw new Error("content must be a string for append mode");
            }
            await fs.appendFile(resolvedPath, contentArg, "utf8");
            const stats = await fs.stat(resolvedPath);
            return { file_path: resolvedPath, bytes: stats.size, action: "appended" };
        }

        // replace mode
        if (typeof findArg !== "string") {
            throw new Error("find must be a string for replace mode");
        }
        if (typeof replaceArg !== "string") {
            throw new Error("replace must be a string for replace mode");
        }
        let original = "";
        try {
            original = await fs.readFile(resolvedPath, "utf8");
        } catch (err) {
            throw new Error(`Cannot read file for replace: ${resolvedPath}`);
        }
        const updated = original.replace(findArg, replaceArg);
        const changed = updated !== original;
        if (changed) {
            await fs.writeFile(resolvedPath, updated, "utf8");
        }
        return { file_path: resolvedPath, changed, action: "replaced" };
    },
};
