const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { version: APP_VERSION } = require('../package.json');

const ROOT = path.resolve(__dirname, '..');
const RELEASE_DIR = path.join(ROOT, 'release');
const APP_DIR = path.join(RELEASE_DIR, 'win-unpacked');
const PACKAGE_DIR = path.join(RELEASE_DIR, 'squirrel-package');
const INSTALLER_DIR = path.join(RELEASE_DIR, 'squirrel-installer');
const BUILDER_CACHE = path.join(ROOT, '.electron-builder-cache');
const DOTNET_HOME = path.join(ROOT, '.dotnet-home');
const VENDOR_DIR = path.join(ROOT, 'node_modules', 'electron-winstaller', 'vendor');
const ELECTRON_BUILDER_CLI = path.join(ROOT, 'node_modules', 'electron-builder', 'cli.js');
const SETUP_NAME = `SWebStamp Setup ${APP_VERSION}.exe`;
const WINDOWS_COMMANDS = Object.freeze({ dotnet: 'dotnet.exe' });

const run = (command, args, environment = {}) => {
    const executable = process.platform === 'win32' ? WINDOWS_COMMANDS[command] || command : command;
    const result = spawnSync(executable, args, {
        cwd: ROOT,
        env: { ...process.env, ...environment },
        stdio: 'inherit'
    });
    if (result.error) throw result.error;
    if (result.status !== 0) {
        throw new Error(`${command} failed with exit code ${result.status}`);
    }
};

const resetDirectory = (directory) => {
    fs.rmSync(directory, { recursive: true, force: true });
    fs.mkdirSync(directory, { recursive: true });
};

const prepareResourceEditor = () => {
    const target = path.join(BUILDER_CACHE, 'winCodeSign', 'winCodeSign-2.6.0');
    fs.mkdirSync(target, { recursive: true });
    const source = path.join(VENDOR_DIR, 'rcedit.exe');
    fs.copyFileSync(source, path.join(target, 'rcedit-x64.exe'));
    fs.copyFileSync(source, path.join(target, 'rcedit-ia32.exe'));
};

const packageElectronApp = () => {
    prepareResourceEditor();
    run(process.execPath, [
        ELECTRON_BUILDER_CLI,
        '--dir',
        '--config.electronDist=node_modules/electron/dist'
    ], { ELECTRON_BUILDER_CACHE: BUILDER_CACHE });
    fs.copyFileSync(path.join(ROOT, 'node_modules', 'electron', 'LICENSE'), path.join(APP_DIR, 'LICENSE'));
    fs.copyFileSync(path.join(VENDOR_DIR, 'Squirrel.exe'), path.join(APP_DIR, 'Squirrel.exe'));
};

const createNugetPackage = () => {
    resetDirectory(PACKAGE_DIR);
    run('dotnet', [
        'pack',
        'scripts/squirrel-installer/SWebStamp.csproj',
        '-c',
        'Release',
        `-p:NuspecProperties=version=${APP_VERSION}`,
        '-o',
        PACKAGE_DIR
    ], {
        DOTNET_CLI_HOME: DOTNET_HOME,
        DOTNET_SKIP_FIRST_TIME_EXPERIENCE: '1',
        DOTNET_CLI_TELEMETRY_OPTOUT: '1'
    });
};

const createSquirrelInstaller = () => {
    resetDirectory(INSTALLER_DIR);
    run(path.join(VENDOR_DIR, 'Squirrel-Mono.exe'), [
        '--releasify',
        path.join(PACKAGE_DIR, `SWebStamp.${APP_VERSION}.nupkg`),
        '--releaseDir',
        INSTALLER_DIR,
        '--loadingGif',
        path.join(ROOT, 'node_modules', 'electron-winstaller', 'resources', 'install-spinner.gif'),
        '--no-msi',
        '--no-delta'
    ]);

    fs.copyFileSync(path.join(INSTALLER_DIR, 'Setup.exe'), path.join(RELEASE_DIR, SETUP_NAME));
    fs.copyFileSync(path.join(INSTALLER_DIR, 'RELEASES'), path.join(RELEASE_DIR, `SWebStamp-${APP_VERSION}-RELEASES`));
    fs.copyFileSync(
        path.join(INSTALLER_DIR, `SWebStamp-${APP_VERSION}-full.nupkg`),
        path.join(RELEASE_DIR, `SWebStamp-${APP_VERSION}-full.nupkg`)
    );
    fs.rmSync(path.join(RELEASE_DIR, `${SETUP_NAME}.blockmap`), { force: true });
};

packageElectronApp();
createNugetPackage();
createSquirrelInstaller();
console.log(`Installer created: ${path.join(RELEASE_DIR, SETUP_NAME)}`);
