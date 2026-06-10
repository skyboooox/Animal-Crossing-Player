import type { TownTuneNote } from '../types';

interface NotePreviewProps {
  notes: TownTuneNote[];
  ariaLabel: string;
}

export function NotePreview({ notes, ariaLabel }: NotePreviewProps) {
  return (
    <div className="note-preview" aria-label={ariaLabel}>
      {Array.from({ length: 16 }, (_, index) => {
        const note = notes[index];
        return (
          <span className={`note-preview__item note-preview__item--${note?.kind ?? 'empty'}`} key={index}>
            {note?.token ?? '-'}
          </span>
        );
      })}
    </div>
  );
}
