import { createContext, useContext, useRef, useState } from 'react';

import { composeStreams } from 'services/composer';

import { useStreams } from './streams';

type RecordingContextType = {
  recordingStream: MediaStream | null;
  isRecording: boolean;
  isPaused: boolean;
  startRecording: () => void;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
};

const RecordingContext = createContext<RecordingContextType | undefined>(
  undefined
);

type RecordingProviderProps = {
  children: React.ReactNode;
};
export const RecordingProvider = ({ children }: RecordingProviderProps) => {
  const [recordingStream, setRecordingStream] = useState<MediaStream | null>(
    null
  );
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const { cameraStream, screenshareStream } = useStreams();

  const mediaRecorder = useRef<MediaRecorder>();

  const startRecording = async () => {
    if (!screenshareStream) return;

    setIsRecording(true);

    const composedStream = composeStreams(cameraStream, screenshareStream);

    setRecordingStream(composedStream);

    mediaRecorder.current = new MediaRecorder(composedStream, {
      mimeType: 'video/webm; codecs=vp9',
      videoBitsPerSecond: 8e6,
    });

    const chunks: Blob[] = [];

    mediaRecorder.current.ondataavailable = (event) => {
      if (event.data.size > 0) chunks.push(event.data);
    };

    mediaRecorder.current.onstop = () => {
      setRecordingStream(null);

      const blob = new Blob(chunks);

      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'recording.webm';
      link.click();

      window.URL.revokeObjectURL(url);
    };

    mediaRecorder.current.start();
  };

  const stopRecording = () => {
    setIsRecording(false);
    mediaRecorder.current?.stop();
  };

  const pauseRecording = () => {
    setIsPaused(true);
    mediaRecorder.current?.pause();
  };

  const resumeRecording = () => {
    setIsPaused(false);
    mediaRecorder.current?.resume();
  };

  return (
    <RecordingContext.Provider
      value={{
        recordingStream,
        isRecording,
        isPaused,
        startRecording,
        stopRecording,
        pauseRecording,
        resumeRecording,
      }}
    >
      {children}
    </RecordingContext.Provider>
  );
};

export const useRecording = (): RecordingContextType => {
  const context = useContext(RecordingContext);

  if (context === undefined) {
    throw new Error('useRecording must be used within a RecordingProvider');
  }

  return context;
};
