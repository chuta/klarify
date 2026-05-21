'use client';

// =============================================================================
// Thin wrapper around @tinymce/tinymce-react's `Editor`.
//
// Reasons this file exists rather than `dynamic(import('@tinymce/...'), …)`
// inline in the consumer:
//
//   1. The 6.x release of `@tinymce/tinymce-react` ships type declarations
//      that include an `unknown` in the prop-types nominal-type hack field,
//      which Next.js's `dynamic()` typing rejects with TS2345. Importing the
//      Editor as a regular component module here lets us narrow the prop
//      surface ourselves and avoid the upstream typing bug.
//   2. TinyMCE accesses `window` at module load. Using a client component
//      with the actual import done inside `useEffect` defers the load until
//      the browser has mounted the component — no SSR window-not-defined.
//   3. We keep the public prop surface tight (just what `DraftResponseCard`
//      actually uses) so swapping editors later is a one-file change.
// =============================================================================
import { useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';

export interface TinyEditorProps {
  apiKey: string;
  initialValue: string;
  onEditorChange: (html: string) => void;
  /** Pixel height of the editing surface. */
  height?: number;
}

export function TinyEditor(props: TinyEditorProps): ReactNode {
  // We dynamically import the package the first time this component mounts.
  // While loading, render a non-disruptive placeholder so the layout doesn't
  // jump when TinyMCE finishes booting (~150–400 ms first load, cached after).
  const [EditorComponent, setEditorComponent] = useState<
    null | React.ComponentType<{
      apiKey: string;
      initialValue: string;
      onEditorChange: (html: string) => void;
      init: Record<string, unknown>;
    }>
  >(null);
  const loadAttempted = useRef(false);

  useEffect(() => {
    if (loadAttempted.current) return;
    loadAttempted.current = true;
    void import('@tinymce/tinymce-react')
      .then((mod) => {
        // Cast through `unknown` — the upstream Editor type has a typing
        // bug we don't want to propagate into our codebase.
        setEditorComponent(
          () =>
            mod.Editor as unknown as React.ComponentType<{
              apiKey: string;
              initialValue: string;
              onEditorChange: (html: string) => void;
              init: Record<string, unknown>;
            }>,
        );
      })
      .catch((err: unknown) => {
        console.error('[TinyEditor] failed to load editor module', err);
      });
  }, []);

  if (!EditorComponent) {
    return (
      <div
        className="flex items-center justify-center rounded-lg border border-[#E5E5E5] bg-[#FAFAFA] text-xs text-[#777]"
        style={{ height: props.height ?? 480 }}
        aria-busy="true"
      >
        Loading editor…
      </div>
    );
  }

  return (
    <EditorComponent
      apiKey={props.apiKey}
      initialValue={props.initialValue}
      onEditorChange={props.onEditorChange}
      init={{
        height: props.height ?? 480,
        menubar: false,
        branding: false,
        statusbar: false,
        plugins: [
          'lists',
          'link',
          'autolink',
          'paste',
          'wordcount',
          'searchreplace',
          'preview',
          'fullscreen',
        ],
        toolbar:
          'undo redo | blocks | bold italic underline | ' +
          'bullist numlist | outdent indent | ' +
          'alignleft aligncenter alignright | removeformat | preview fullscreen',
        block_formats: 'Paragraph=p; Heading=h2; Sub-heading=h3',
        content_style:
          "body { font-family: Georgia, 'Times New Roman', serif; " +
          "font-size: 14px; line-height: 1.6; color: #1A1A1A; padding: 16px; } " +
          'strong { color: #0D2B45; }',
        browser_spellcheck: true,
        contextmenu: false,
        paste_as_text: false,
        paste_data_images: false,
        link_default_target: '_blank',
      }}
    />
  );
}
