import { execFile } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const DEFAULT_TIMEOUT_MS = 120_000;
const PROFILE_PREFIX = 'swebstamp-libreoffice-';

const createProfileDirectory = () => (
    fs.mkdtempSync(path.join(os.tmpdir(), PROFILE_PREFIX))
);

const removeProfileDirectory = profileDirectory => {
    fs.rmSync(profileDirectory, { recursive: true, force: true });
};

const executeCommand = ({ sofficePath, args, timeoutMs }) => new Promise((resolve, reject) => {
    execFile(sofficePath, args, { timeout: timeoutMs }, (error, stdout, stderr) => {
        if (error) {
            reject(error);
            return;
        }
        resolve({ stdout, stderr });
    });
});

const DEFAULT_DEPENDENCIES = Object.freeze({
    createProfileDirectory,
    executeCommand,
    removeProfileDirectory
});

export const buildLibreOfficeArgs = ({ profileDirectory, commandArgs }) => [
    `-env:UserInstallation=${pathToFileURL(profileDirectory).href}`,
    ...commandArgs
];

export const getLibreOfficeCliPath = ({ sofficePath, fileExists = fs.existsSync }) => {
    const parsedPath = path.parse(sofficePath);
    const cliPath = path.join(parsedPath.dir, `${parsedPath.name}.com`);
    return fileExists(cliPath) ? cliPath : sofficePath;
};

export const runLibreOfficeTask = async ({
    sofficePath,
    commandArgs,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    dependencies = {}
}) => {
    const runtime = { ...DEFAULT_DEPENDENCIES, ...dependencies };
    const profileDirectory = runtime.createProfileDirectory();
    try {
        return await runtime.executeCommand({
            sofficePath,
            args: buildLibreOfficeArgs({ profileDirectory, commandArgs }),
            timeoutMs
        });
    } finally {
        runtime.removeProfileDirectory(profileDirectory);
    }
};

export const convertDocumentToPdf = async ({
    sofficePath,
    inputPath,
    outputDirectory,
    runTask = runLibreOfficeTask
}) => {
    const commandArgs = [
        '--headless',
        '--convert-to', 'pdf',
        '--outdir', outputDirectory,
        inputPath
    ];
    await runTask({ sofficePath, commandArgs });
    const pdfPath = path.join(outputDirectory, `${path.parse(inputPath).name}.pdf`);
    if (!fs.existsSync(pdfPath)) {
        throw new Error('转换完成但未找到输出 PDF 文件');
    }
    return pdfPath;
};
