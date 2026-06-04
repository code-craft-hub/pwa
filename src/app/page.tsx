import type { Metadata } from 'next';
import { TextToSpeechReader } from '@/module/text-to-speech';

export const metadata: Metadata = {
  title: 'Text to Speech Reader',
  description:
    'Free offline/online text-to-speech reader. Uses high-quality cloud voices when connected and your browser\'s built-in voices when offline.',
};

export default function TTSPage() {
  return <TextToSpeechReader />;
}
