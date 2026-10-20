const ACTION_BY_EVENT = Object.freeze({
    '--squirrel-install': 'create-shortcut',
    '--squirrel-updated': 'create-shortcut',
    '--squirrel-uninstall': 'remove-shortcut',
    '--squirrel-obsolete': 'quit',
});

export function getSquirrelAction(event) {
    return ACTION_BY_EVENT[event] ?? null;
}
