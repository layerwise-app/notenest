import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { parseInline } from '../src/lib/markdown.ts';
import { absoluteFileRefs, attachmentMarkdown, fileRefId } from '../src/lib/note-files.ts';
import { plainText } from '../src/lib/note-text.ts';

const id = '0f8fad5b-d9cb-469f-a165-70867728950e';

describe('attachment references', () => {
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

  test('writes image and link Markdown with a safe label', () => {
    assert.equal(attachmentMarkdown({ id, name: 'Photo.PNG', contentType: 'image/png' }), `![Photo.PNG](/api/files/${id})`);
    assert.equal(
      attachmentMarkdown({ id, name: 'a]b[c\\d\n.pdf', contentType: 'application/pdf' }),
      `[a b c d .pdf](/api/files/${id})`
    );
    assert.equal(attachmentMarkdown({ id, name: 'logo.svg', contentType: 'image/svg+xml' }), `[logo.svg](/api/files/${id})`);
  });

  test('makes references absolute for export', () => {
    assert.equal(
      absoluteFileRefs(`![a](/api/files/${id}) [b](/api/files/${id}) [c](/elsewhere)`, 'https://notes.example'),
      `![a](https://notes.example/api/files/${id}) [b](https://notes.example/api/files/${id}) [c](/elsewhere)`
    );
  });
});

describe('parsing attachments', () => {
  test('renders file references as image and file nodes', () => {
    assert.deepEqual(parseInline(`![Chart](/api/files/${id}) and [Report.pdf](/api/files/${id})`), [
      { type: 'image', fileId: id, alt: 'Chart' },
      { type: 'text', text: ' and ' },
      { type: 'file', fileId: id, children: [{ type: 'text', text: 'Report.pdf' }] }
    ]);
  });

  test('never renders other image sources', () => {
    assert.deepEqual(parseInline('![x](javascript:alert(1))'), [{ type: 'text', text: '!x)' }]);
    const nodes = parseInline('![pic](https://a.b/c.png)');
    assert.equal(nodes.some((node) => node.type === 'image'), false);
    assert.deepEqual(nodes[0], { type: 'text', text: '!' });
    assert.equal(nodes[1].type, 'link');
    assert.equal(parseInline(`![x](/api/files/${id}/../../x)`).some((node) => node.type === 'image'), false);
  });

  test('plain text keeps attachment names', () => {
    assert.equal(plainText(`See ![Chart](/api/files/${id}) and [Report.pdf](/api/files/${id})`), 'See Chart and Report.pdf');
  });
});
