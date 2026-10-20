import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
    buildLibreOfficeArgs,
    convertDocumentToPdf,
    getLibreOfficeCliPath,
    runLibreOfficeTask
} from './libreOfficeProcess.js';

test('builds a LibreOffice command with an isolated file URL profile', () => {
    const args = buildLibreOfficeArgs({
        profileDirectory: 'C:\\Temp\\swebstamp profile',
        commandArgs: ['--headless', '--version']
    });

    assert.equal(args[0], '-env:UserInstallation=file:///C:/Temp/swebstamp%20profile');
    assert.deepEqual(args.slice(1), ['--headless', '--version']);
});

test('uses soffice.com for Windows command-line checks when available', () => {
    const cliPath = getLibreOfficeCliPath({
        sofficePath: 'C:\\LibreOffice\\program\\soffice.exe',
        fileExists: candidate => candidate.endsWith('soffice.com')
    });

    assert.equal(cliPath, 'C:\\LibreOffice\\program\\soffice.com');
});

test('runs with an isolated profile and removes it after success', async () => {
    const events = [];
    const result = await runLibreOfficeTask({
        sofficePath: 'C:\\LibreOffice\\soffice.exe',
        commandArgs: ['--headless', '--version'],
        dependencies: {
            createProfileDirectory: () => 'C:\\Temp\\profile-one',
            executeCommand: async options => {
                events.push(options);
                return { stdout: 'LibreOffice test', stderr: '' };
            },
            removeProfileDirectory: profileDirectory => events.push({ removed: profileDirectory })
        }
    });

    assert.equal(result.stdout, 'LibreOffice test');
    assert.match(events[0].args[0], /UserInstallation=file:\/\/\/C:\/Temp\/profile-one/);
    assert.deepEqual(events[1], { removed: 'C:\\Temp\\profile-one' });
});

test('removes the isolated profile when LibreOffice fails', async () => {
    const removed = [];
    await assert.rejects(() => runLibreOfficeTask({
        sofficePath: 'C:\\LibreOffice\\soffice.exe',
        commandArgs: ['--headless', '--version'],
        dependencies: {
            createProfileDirectory: () => 'C:\\Temp\\profile-two',
            executeCommand: async () => { throw new Error('conversion failed'); },
            removeProfileDirectory: profileDirectory => removed.push(profileDirectory)
        }
    }), /conversion failed/);

    assert.deepEqual(removed, ['C:\\Temp\\profile-two']);
});

test('converts through the isolated LibreOffice task and returns the generated PDF', async () => {
    const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'swebstamp-convert-test-'));
    const inputPath = path.join(directory, 'report.xlsx');
    const pdfPath = path.join(directory, 'report.pdf');
    fs.writeFileSync(inputPath, 'fixture');
    let receivedTask;
    try {
        const result = await convertDocumentToPdf({
            sofficePath: 'C:\\LibreOffice\\soffice.exe',
            inputPath,
            outputDirectory: directory,
            runTask: async task => {
                receivedTask = task;
                fs.writeFileSync(pdfPath, '%PDF fixture');
                return { stdout: 'converted', stderr: '' };
            }
        });

        assert.equal(result, pdfPath);
        assert.deepEqual(receivedTask.commandArgs, [
            '--headless', '--convert-to', 'pdf', '--outdir', directory, inputPath
        ]);
    } finally {
        fs.rmSync(directory, { recursive: true, force: true });
    }
});
