// Video, audio, and file blocks.
import type { Editor } from '@tiptap/core';
import { NodeViewWrapper } from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { Download, ExternalLink, MessageSquareText, Paperclip, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { filePath, fileRefId, formatFileSize } from '~/lib/note-files';
import { cn } from '~/lib/utils';
import { useEditorEnv } from '../editor-env';
import { EmbedFrame } from './embed-frame';
import { focusAfter, MediaCaption, MediaToolbar, ToolbarButton, useEditable, WidthHandles } from './parts';
import { MediaPlaceholder, UploadingRow } from './placeholder';
import type { MediaKind } from './placeholder';
import { startUpload, useUploadSync } from './upload-store';
import { fileNameFromUrl, mediaSrc, videoEmbed } from './urls';

type EmptyProps = NodeViewProps & { kind: MediaKind; onLink?: (url: string) => void };

/** Placeholder or upload progress for a block without a source yet. */
function EmptyMedia({ kind, node, editor, getPos, selected, updateAttributes, onLink }: EmptyProps) {
  const { pageId } = useEditorEnv();
  const uploadId = node.attrs.uploadId as string | null;
  const upload = useUploadSync(editor, uploadId);
  return (
    <NodeViewWrapper className={cn('media-block', selected && 'is-selected')} data-type={node.type.name}>
      {uploadId ? (
        <UploadingRow kind={kind} upload={upload} />
      ) : (
        <MediaPlaceholder
          kind={kind}
          editor={editor}
          getPos={getPos}
          selected={selected}
          onLink={
            onLink ??
            ((url) => {
              updateAttributes({ src: url, name: fileNameFromUrl(url) });
              focusAfter(editor, getPos());
            })
          }
          onFile={(file) => {
            updateAttributes({ uploadId: startUpload(editor, file, pageId), name: file.name });
            focusAfter(editor, getPos());
          }}
        />
      )}
    </NodeViewWrapper>
  );
}

/** Video links from YouTube, Vimeo, or Loom become embed blocks, like Notion. */
function replaceWithEmbed(editor: Editor, pos: number | undefined, url: string) {
  if (typeof pos !== 'number') return;
  const node = editor.state.doc.nodeAt(pos);
  if (!node) return;
  editor
    .chain()
    .command(({ tr, state }) => {
      tr.replaceWith(pos, pos + node.nodeSize, state.schema.nodes.embed.create({ url }));
      return true;
    })
    .run();
  focusAfter(editor, pos);
}

function Actions({ editor, src, name, onCaption, deleteNode, captionActive }: {
  editor: Editor;
  src: string;
  name: string;
  onCaption?: () => void;
  captionActive?: boolean;
  deleteNode: () => void;
}) {
  const editable = useEditable(editor);
  const fileId = fileRefId(src);
  return (
    <MediaToolbar>
      {editable && onCaption && (
        <ToolbarButton label='Caption' active={captionActive} onClick={onCaption}>
          <MessageSquareText />
        </ToolbarButton>
      )}
      {fileId ? (
        <ToolbarButton label='Download' href={filePath(fileId, true)} download={name}>
          <Download />
        </ToolbarButton>
      ) : (
        <ToolbarButton label='Open original' href={src}>
          <ExternalLink />
        </ToolbarButton>
      )}
      {editable && (
        <ToolbarButton label='Delete' onClick={deleteNode}>
          <Trash2 />
        </ToolbarButton>
      )}
    </MediaToolbar>
  );
}

/** Caption state shared by video and audio. */
function useCaption(props: NodeViewProps) {
  const [open, setOpen] = useState(false);
  const value = String(props.node.attrs.caption ?? '');
  const editable = useEditable(props.editor);
  const element = (
    <MediaCaption
      value={value}
      editable={editable}
      open={open}
      onClose={() => setOpen(false)}
      onChange={(caption) => props.updateAttributes({ caption })}
      onExit={() => focusAfter(props.editor, props.getPos())}
    />
  );
  return { element, active: open || !!value, show: () => setOpen(true) };
}

export function VideoView(props: NodeViewProps) {
  const src = mediaSrc(props.node.attrs.src);
  if (!src) {
    return (
      <EmptyMedia
        {...props}
        kind='video'
        onLink={(url) => {
          if (videoEmbed(url)) {
            replaceWithEmbed(props.editor, props.getPos(), url);
          } else {
            props.updateAttributes({ src: url, name: fileNameFromUrl(url) });
            focusAfter(props.editor, props.getPos());
          }
        }}
      />
    );
  }
  return <VideoFigure key={src} {...props} src={src} />;
}

function VideoFigure(props: NodeViewProps & { src: string }) {
  const { node, editor, selected, updateAttributes, deleteNode, src } = props;
  const editable = useEditable(editor);
  const frame = useRef<HTMLDivElement>(null);
  const [liveWidth, setLiveWidth] = useState<number | null>(null);
  const caption = useCaption(props);
  const width = liveWidth ?? (node.attrs.width as number | null);
  const embed = videoEmbed(src);
  const name = (node.attrs.name as string | null) ?? fileNameFromUrl(src);
  return (
    <NodeViewWrapper className={cn('media-block', selected && 'is-selected')} data-type='video'>
      <div className='media-row' data-align='center'>
        <figure className='media-figure' style={{ width: width ? `${width}px` : '100%' }}>
          <div ref={frame} className='media-frame'>
            {embed ? (
              <EmbedFrame target={embed} title={name} />
            ) : (
              <video src={src} controls preload='metadata' playsInline />
            )}
            {editable && (
              <WidthHandles frame={frame} align='center' onPreview={setLiveWidth} onCommit={(next) => updateAttributes({ width: next })} />
            )}
            <Actions editor={editor} src={src} name={name} onCaption={caption.show} captionActive={caption.active} deleteNode={deleteNode} />
          </div>
          {caption.element}
        </figure>
      </div>
    </NodeViewWrapper>
  );
}

export function AudioView(props: NodeViewProps) {
  const src = mediaSrc(props.node.attrs.src);
  if (!src) return <EmptyMedia {...props} kind='audio' />;
  return <AudioFigure key={src} {...props} src={src} />;
}

function AudioFigure(props: NodeViewProps & { src: string }) {
  const { node, editor, selected, deleteNode, src } = props;
  const caption = useCaption(props);
  const name = (node.attrs.name as string | null) ?? fileNameFromUrl(src);
  return (
    <NodeViewWrapper className={cn('media-block', selected && 'is-selected')} data-type='audio'>
      <figure className='media-figure is-full'>
        <div className='media-frame audio-frame'>
          <audio src={src} controls preload='metadata' />
          <Actions editor={editor} src={src} name={name} onCaption={caption.show} captionActive={caption.active} deleteNode={deleteNode} />
        </div>
        {caption.element}
      </figure>
    </NodeViewWrapper>
  );
}

export function FileView(props: NodeViewProps) {
  const { node, editor, selected, deleteNode } = props;
  const src = mediaSrc(node.attrs.src);
  const editable = useEditable(editor);
  if (!src) return <EmptyMedia {...props} kind='file' />;
  const fileId = fileRefId(src);
  const name = (node.attrs.name as string | null) || fileNameFromUrl(src);
  const size = node.attrs.size as number | null;
  return (
    <NodeViewWrapper className={cn('media-block', selected && 'is-selected')} data-type='fileBlock'>
      <div className='media-frame file-frame'>
        <FileLink href={fileId ? filePath(fileId, true) : src} download={fileId ? name : undefined}>
          <Paperclip className='file-row-icon' />
          <span className='file-row-name'>{name}</span>
          {size !== null && <span className='file-row-size'>{formatFileSize(size)}</span>}
        </FileLink>
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

function FileLink({ href, download, children }: { href: string; download?: string; children: ReactNode }) {
  return (
    <a
      className='file-row'
      href={href}
      download={download}
      target={download === undefined ? '_blank' : undefined}
      rel='noopener noreferrer nofollow'
    >
      {children}
    </a>
  );
}
