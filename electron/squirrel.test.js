import test from 'node:test';
import assert from 'node:assert/strict';
import { getSquirrelAction } from './squirrel.js';

test('handles lifecycle events but allows first run to start the app', () => {
    assert.equal(getSquirrelAction('--squirrel-install'), 'create-shortcut');
    assert.equal(getSquirrelAction('--squirrel-updated'), 'create-shortcut');
    assert.equal(getSquirrelAction('--squirrel-uninstall'), 'remove-shortcut');
    assert.equal(getSquirrelAction('--squirrel-obsolete'), 'quit');
    assert.equal(getSquirrelAction('--squirrel-firstrun'), null);
    assert.equal(getSquirrelAction('--unknown'), null);
});
