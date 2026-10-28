import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { absoluteFileRefs, fileRefId, mediaKindFor } from '../src/lib/note-files.ts';

const id = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('file references', () => {
  test('only accepts app file paths with a UUID', () => {
    assert.equal(fileRefId(`/api/files/${id}`), id);
    for (const href of [
      `/api/files/${id}/x`,
      `/api/files/${id}?download=1`,
      `https://evil.example/api/files/${id}`,
      `//evil.example/api/files/${id}`,
      '/api/files/../auth/session',
      '/api/files/not-a-uuid'
    ]) {
      assert.equal(fileRefId(href), null, href);
    }
  });

  test('picks the block for a file type', () => {
    assert.equal(mediaKindFor('image/png'), 'image');
    assert.equal(mediaKindFor('image/svg+xml'), 'file');
    assert.equal(mediaKindFor('video/mp4'), 'video');
    assert.equal(mediaKindFor('audio/mpeg'), 'audio');
    assert.equal(mediaKindFor('application/pdf'), 'file');
  });

  test('makes file links absolute for exported Markdown', () => {
    assert.equal(
      absoluteFileRefs(`![a](/api/files/${id}) [b](/notes/x)`, 'https://notes.example'),
      `![a](https://notes.example/api/files/${id}) [b](/notes/x)`
    );
  });
});
