// The image block: placeholder, upload preview, then the image with Notion's
// hover toolbar, side resize handles, and caption.
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { AlignCenter, AlignLeft, AlignRight, Download, ImageOff, Maximize2, MessageSquareText, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { filePath, fileRefId } from '~/lib/note-files';
import { cn } from '~/lib/utils';
import { useEditorEnv } from '../editor-env';
import { parseAlign } from './attrs';
import type { Align } from './attrs';
import { focusAfter, MediaCaption, MediaToolbar, ToolbarButton, ToolbarDivider, useEditable, WidthHandles } from './parts';
import { MediaPlaceholder, UploadingRow, UploadProgress } from './placeholder';
import { startUpload, useUploadSync } from './upload-store';
import { fileNameFromUrl, mediaSrc } from './urls';

const ALIGN_BUTTONS: { align: Align; label: string; icon: typeof AlignLeft }[] = [
  { align: 'left', label: 'Align left', icon: AlignLeft },
  { align: 'center', label: 'Align center', icon: AlignCenter },
  { align: 'right', label: 'Align right', icon: AlignRight }
];

export function ImageView(props: NodeViewProps) {
  const { node, editor, getPos, selected, updateAttributes } = props;
  const { pageId } = useEditorEnv();
  const uploadId = node.attrs.uploadId as string | null;
  const upload = useUploadSync(editor, uploadId);
  const src = mediaSrc(node.attrs.src);
  const align = parseAlign(node.attrs.align);
  const width = node.attrs.width as number | null;

  if (src) return <ImageFigure key={src} {...props} src={src} />;
  return (
    <NodeViewWrapper className={cn('media-block', selected && 'is-selected')} data-type='image'>
      {uploadId && upload?.previewUrl ? (
        <div className='media-row' data-align={align}>
          <div className='media-figure' style={{ width: width ? `${width}px` : undefined }}>
            <div className='media-frame is-uploading'>
              <img src={upload.previewUrl} alt='' draggable={false} />
              <UploadProgress progress={upload.progress} />
            </div>
          </div>
        </div>
      ) : uploadId ? (
        <UploadingRow kind='image' upload={upload} />
      ) : (
        <MediaPlaceholder
          kind='image'
          editor={editor}
          getPos={getPos}
          selected={selected}
          onLink={(url) => {
            updateAttributes({ src: url, name: fileNameFromUrl(url) });
            focusAfter(editor, getPos());
          }}
          onFile={(file) => {
            updateAttributes({ uploadId: startUpload(editor, file, pageId), name: file.name });
            focusAfter(editor, getPos());
          }}
        />
      )}
    </NodeViewWrapper>
  );
}

function ImageFigure({ node, editor, getPos, selected, updateAttributes, deleteNode, src }: NodeViewProps & { src: string }) {
  const editable = useEditable(editor);
  const frame = useRef<HTMLDivElement>(null);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const [failed, setFailed] = useState(false);
  const [captionOpen, setCaptionOpen] = useState(false);
  const caption = String(node.attrs.caption ?? '');
  const name = (node.attrs.name as string | null) ?? '';
  const align = parseAlign(node.attrs.align);
  const width = liveWidth ?? (node.attrs.width as number | null);
  const fileId = fileRefId(src);

  if (failed) {
    return (
      <NodeViewWrapper className={cn('media-block', selected && 'is-selected')} data-type='image'>
        <div className='media-frame'>
          <div className='media-placeholder is-error'>
            <ImageOff className='media-placeholder-icon' />
            <span className='media-error-text'>Couldn’t load the image</span>
          </div>
          {editable && (
            <MediaToolbar>
              <ToolbarButton label='Delete' onClick={deleteNode}>
                <Trash2 />
              </ToolbarButton>
            </MediaToolbar>
          )}
        </div>
      </NodeViewWrapper>
    );
  }

  return (
    <NodeViewWrapper className={cn('media-block', selected && 'is-selected')} data-type='image'>
      <div className='media-row' data-align={align}>
        <figure className='media-figure' style={{ width: width ? `${width}px` : undefined }}>
          <div ref={frame} className='media-frame'>
            <img
              src={src}
              alt={caption || name}
              draggable={false}
              decoding='async'
              style={width ? { width: '100%' } : undefined}
              onError={() => setFailed(true)}
            />
            {editable && (
              <WidthHandles
                frame={frame}
                align={align}
                onPreview={setLiveWidth}
                onCommit={(next) => updateAttributes({ width: next })}
              />
            )}
            <MediaToolbar>
              {editable && (
                <>
                  {ALIGN_BUTTONS.map(({ align: value, label, icon: Icon }) => (
                    <ToolbarButton key={value} label={label} active={align === value} onClick={() => updateAttributes({ align: value })}>
                      <Icon />
                    </ToolbarButton>
                  ))}
                  <ToolbarDivider />
                  <ToolbarButton label='Caption' active={captionOpen || !!caption} onClick={() => setCaptionOpen(true)}>
                    <MessageSquareText />
                  </ToolbarButton>
                </>
              )}
              <ToolbarButton label='View original' href={src}>
                <Maximize2 />
              </ToolbarButton>
              {fileId && (
                <ToolbarButton label='Download' href={filePath(fileId, true)} download={name}>
                  <Download />
                </ToolbarButton>
              )}
              {editable && (
                <ToolbarButton label='Delete' onClick={deleteNode}>
                  <Trash2 />
                </ToolbarButton>
              )}
            </MediaToolbar>
          </div>
          <MediaCaption
            value={caption}
            editable={editable}
            open={captionOpen}
            onClose={() => setCaptionOpen(false)}
            onChange={(value) => updateAttributes({ caption: value })}
            onExit={() => focusAfter(editor, getPos())}
          />
        </figure>
      </div>
    </NodeViewWrapper>
  );
}
