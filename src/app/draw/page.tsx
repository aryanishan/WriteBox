import type { Metadata } from 'next';
import { DrawPage } from '@/frontend/components/draw/DrawPage';

export const metadata: Metadata = {
  title: 'Draw — WriteBox',
  description:
    'Freeform drawing canvas with brushes, shapes, colors, and an eraser. Sketch diagrams, doodle, or illustrate your ideas.',
};

export default function Draw() {
  return <DrawPage />;
}
