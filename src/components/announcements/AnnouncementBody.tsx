import React, { useMemo } from 'react';
import { InlineSpan, parseBody } from '../../lib/announcementsCore';

function Spans({ spans }: { spans: InlineSpan[] }) {
  return (
    <>
      {spans.map((s, i) =>
        s.bold ? (
          <strong key={i} className="font-bold text-text-primary">{s.text}</strong>
        ) : s.italic ? (
          <em key={i}>{s.text}</em>
        ) : (
          <React.Fragment key={i}>{s.text}</React.Fragment>
        ),
      )}
    </>
  );
}

/** Render isi pengumuman (Markdown ringan) sebagai elemen React — tidak pernah memakai HTML mentah. */
export const AnnouncementBody: React.FC<{ body: string }> = ({ body }) => {
  const blocks = useMemo(() => parseBody(body), [body]);
  return (
    <div className="space-y-2.5 text-sm text-text-secondary leading-relaxed font-body break-words">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'heading':
            return (
              <h4 key={i} className="pt-1 text-sm sm:text-base font-bold font-heading text-text-primary">
                <Spans spans={b.spans} />
              </h4>
            );
          case 'bullet':
            return (
              <div key={i} className="flex gap-2 pl-1">
                <span className="text-gold shrink-0">•</span>
                <span className="min-w-0"><Spans spans={b.spans} /></span>
              </div>
            );
          case 'quote':
            return (
              <p key={i} className="pl-3 border-l-2 border-gold/50 italic">
                <Spans spans={b.spans} />
              </p>
            );
          case 'divider':
            return <hr key={i} className="border-border-subtle" />;
          default:
            return (
              <p key={i} className="whitespace-pre-line">
                <Spans spans={b.spans} />
              </p>
            );
        }
      })}
    </div>
  );
};
